import * as XLSX from 'xlsx';

export interface AttendanceRecord {
    id: string;
    fullName: string;
    date: string;
    shift: string; // Captured from "Shift" or "Shift Code"
    scheduleIn: string;
    scheduleOut: string;
    checkIn: string;
    checkOut: string;
    lateMinutes: number;
    totalLateCount: number;
    isShiftAdjusted?: boolean; // New flag to indicate auto-detection
    originalSchedule?: string; // To show what it was before adjustment
}

export interface SummaryStats {
    totalCases: number;
    totalEmployees: number;
    avgPerEmployee: number;
    top5: { name: string; count: number }[];
}

const DEFAULT_WORK_START = "08:00";
const DEFAULT_WORK_END = "17:00";
const LATE_THRESHOLD_MINUTES = 130; // Max accepted late before checking other shifts

// List of all valid shift start times provided by user
const KNOWN_SHIFTS_START = [
    "06:00", "06:30", "06:45", "07:00", "07:45",
    "09:00", "10:00", "11:00", "12:00", "13:00",
    "13:15", "13:45", "14:30", "14:45", "15:00"
].map(s => ({ str: s, min: timeToMinutes(s) }));

/**
 * Helper to find a column key in a row object based on a list of potential candidate names.
 */
function findColumn(row: any, candidates: string[]): string | undefined {
    const keys = Object.keys(row);
    for (const c of candidates) {
        const normalizedCandidate = c.toLowerCase().trim();
        const found = keys.find(k => k.toLowerCase().trim() === normalizedCandidate);
        if (found) return found;
    }
    return undefined;
}

/**
 * Parsing logic for various time formats from Excel
 */
function parseTime(val: any): string | null {
    if (val === null || val === undefined) return null;

    if (typeof val === 'number') {
        const totalSeconds = Math.round(val * 24 * 3600);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    if (typeof val === 'string') {
        const trimmed = val.trim();
        const match = trimmed.match(/(\d{1,2}):(\d{2})/);
        if (match) {
            const h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
    }

    if (val instanceof Date) {
        const h = val.getHours();
        const m = val.getMinutes();
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    return null;
}

function timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function findNearestShift(checkInMinutes: number): string {
    let bestShift = KNOWN_SHIFTS_START[0].str;
    let minDiff = Math.abs(checkInMinutes - KNOWN_SHIFTS_START[0].min);

    for (const shift of KNOWN_SHIFTS_START) {
        const diff = Math.abs(checkInMinutes - shift.min);
        if (diff < minDiff) {
            minDiff = diff;
            bestShift = shift.str;
        }
    }
    return bestShift;
}

export async function processExcelFile(file: File): Promise<{
    data: AttendanceRecord[];
    summary: SummaryStats;
}> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (jsonData.length === 0) {
        throw new Error("File kosong atau tidak dapat dibaca.");
    }

    const firstRow = jsonData[0];

    // Identify columns
    const nameCol = findColumn(firstRow, ["Full Name", "Employee Name", "Name", "Nama"]);
    const dateCol = findColumn(firstRow, ["Date*", "Date", "Attendance Date", "Tanggal"]);
    const shiftCol = findColumn(firstRow, ["Shift", "Shift Code", "Working Shift Code"]);
    const checkinCol = findColumn(firstRow, ["Check In", "Clock In", "In Time", "Jam Masuk"]);
    const scheduleInCol = findColumn(firstRow, ["Schedule In", "Shift In", "Jam Masuk Jadwal"]);
    const scheduleOutCol = findColumn(firstRow, ["Schedule Out", "Shift Out", "Jam Pulang Jadwal"]);
    const checkoutCol = findColumn(firstRow, ["Check Out", "Clock Out", "Out Time", "Jam Pulang"]);

    if (!nameCol || !checkinCol) {
        throw new Error("Kolom wajib (Nama / Check In) tidak ditemukan.");
    }

    const processedRows: any[] = [];
    const lateCounts: Record<string, number> = {};

    jsonData.forEach((row: any) => {
        const rawName = row[nameCol];
        if (!rawName || rawName.toString().trim() === "" || rawName.toString().toLowerCase() === "nan") return;

        const name = rawName.toString().trim();
        const checkInTime = parseTime(row[checkinCol]);
        const shiftOrCode = shiftCol ? row[shiftCol]?.toString() : "";

        // Default or Parsed Schedule
        let isOff = false;
        let scheduleTime = DEFAULT_WORK_START;
        let scheduleOutTime = DEFAULT_WORK_END;
        let originalScheduleTime = "";

        if (scheduleInCol) {
            const rawSched = row[scheduleInCol];
            // Check for OFF: Explicit "Off" text or "00:00" time
            const rawSchedStr = rawSched ? rawSched.toString().toLowerCase() : "";

            if (rawSchedStr.includes('off') || rawSchedStr.trim() === '') {
                isOff = true;
                scheduleTime = "";
            } else {
                const parsedSched = parseTime(rawSched);
                if (parsedSched) {
                    scheduleTime = parsedSched;
                    originalScheduleTime = parsedSched;
                    // Treat 00:00 as OFF
                    if (scheduleTime === "00:00") {
                        isOff = true;
                        scheduleTime = "";
                    }
                }
            }
        }

        if (scheduleOutCol) {
            const parsedSchedOut = parseTime(row[scheduleOutCol]);
            if (parsedSchedOut) scheduleOutTime = parsedSchedOut;
        }

        if (!checkInTime) return; // Skip invalid checkin

        // MAIN LOGIC: Automatic Shift Detection
        let finalScheduleIn = scheduleTime;
        let isShiftAdjusted = false;
        const checkInMin = timeToMinutes(checkInTime);
        let lateMinutes = 0;

        // CHECK 1: User is OFF (e.g. "00:00" or "Day Off") but present
        if (isOff || scheduleTime === "") {
            finalScheduleIn = findNearestShift(checkInMin);
            isShiftAdjusted = true;
            originalScheduleTime = "OFF";
        }
        else {
            // CHECK 2: User is Scheduled but late > Threshold
            const schedMin = timeToMinutes(scheduleTime);
            let diff = checkInMin - schedMin;

            if (diff > LATE_THRESHOLD_MINUTES) {
                // Try to find a better matching shift
                const nearestShiftStr = findNearestShift(checkInMin);
                const nearestShiftMin = timeToMinutes(nearestShiftStr);

                // Switch if nearest shift is closer to CheckIn than the original Schedule
                // Example: Sched 07:45, CheckIn 13:45. Diff 360.
                // Nearest 13:45. NewDiff 0. 
                // 0 < 360 -> Switch.
                if (Math.abs(checkInMin - nearestShiftMin) < Math.abs(diff)) {
                    finalScheduleIn = nearestShiftStr;
                    isShiftAdjusted = true;
                    diff = checkInMin - nearestShiftMin;
                }
            }

            lateMinutes = diff > 0 ? diff : 0;
        }

        // If adjusted, verify late minutes against NEW schedule
        if (isShiftAdjusted) {
            const newSchedMin = timeToMinutes(finalScheduleIn);
            const newDiff = checkInMin - newSchedMin;
            lateMinutes = newDiff > 0 ? newDiff : 0;
        }

        if (lateMinutes > 0 || isShiftAdjusted) { // Also push adjusted rows even if 0 late (to show they were present)
            if (lateMinutes > 0) {
                if (!lateCounts[name]) lateCounts[name] = 0;
                lateCounts[name]++;
            }

            processedRows.push({
                id: Math.random().toString(36).substring(7),
                fullName: name,
                date: dateCol ? (row[dateCol] instanceof Date ? row[dateCol].toLocaleDateString('id-ID') : row[dateCol]?.toString() || "") : "",
                shift: shiftOrCode,
                scheduleIn: finalScheduleIn,
                scheduleOut: scheduleOutTime,
                checkIn: checkInTime,
                checkOut: checkoutCol ? (parseTime(row[checkoutCol]) || row[checkoutCol]?.toString() || "") : "",
                lateMinutes: lateMinutes,
                totalLateCount: 0,
                isShiftAdjusted,
                originalSchedule: originalScheduleTime
            });
        }
    });

    const finalResults: AttendanceRecord[] = processedRows.map(r => ({
        ...r,
        totalLateCount: lateCounts[r.fullName] || 0
    })).sort((a, b) => {
        return a.fullName.localeCompare(b.fullName) || a.date.localeCompare(b.date);
    });

    const totalCases = finalResults.filter(r => r.lateMinutes > 0).length;
    const totalEmployees = Object.keys(lateCounts).length;
    const avgPerEmployee = totalEmployees ? parseFloat((totalCases / totalEmployees).toFixed(2)) : 0;

    const top5 = Object.entries(lateCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    return {
        data: finalResults,
        summary: {
            totalCases,
            totalEmployees,
            avgPerEmployee,
            top5
        }
    };
}
