import * as XLSX from 'xlsx';

export interface AttendanceRecord {
    id: string;
    fullName: string;
    date: string;
    shift: string;
    scheduleIn: string;
    scheduleOut: string;
    checkIn: string;
    checkOut: string;
    lateMinutes: number;
    totalLateCount: number;
    isShiftAdjusted?: boolean;
    originalSchedule?: string;
}

export interface SummaryStats {
    totalCases: number;
    totalEmployees: number;
    avgPerEmployee: number;
    top5: { name: string; count: number }[];
    trends: { date: string; count: number }[];
    shiftDistribution: { name: string; value: number }[];
}

const DEFAULT_WORK_START = "08:00";
const DEFAULT_WORK_END = "17:00";

function findColumn(row: any, candidates: string[]): string | undefined {
    const keys = Object.keys(row);
    for (const c of candidates) {
        const normalizedCandidate = c.toLowerCase().trim();
        const found = keys.find(k => k.toLowerCase().trim() === normalizedCandidate);
        if (found) return found;
    }
    return undefined;
}

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

function findNearestShift(checkInMinutes: number, knownShifts: string[]): string {
    const shiftsArr = knownShifts.length > 0 ? knownShifts : [
        "06:00", "06:30", "06:45", "07:00", "07:45",
        "09:00", "10:00", "11:00", "12:00", "13:00",
        "13:15", "13:45", "14:30", "14:45", "15:00"
    ];

    const shifts = shiftsArr.map(s => ({ str: s, min: timeToMinutes(s) }));
    let bestShift = shifts[0].str;
    let minDiff = Math.abs(checkInMinutes - shifts[0].min);

    for (const shift of shifts) {
        const diff = Math.abs(checkInMinutes - shift.min);
        if (diff < minDiff) {
            minDiff = diff;
            bestShift = shift.str;
        }
    }
    return bestShift;
}

export async function processExcelFile(
    file: File,
    customShifts: string[] = [],
    lateThreshold: number = 130
): Promise<{
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
    const orgCol = findColumn(firstRow, ["Organization", "Organisasi", "Org"]);

    if (!nameCol || !checkinCol) {
        throw new Error("Kolom wajib (Nama / Check In) tidak ditemukan.");
    }

    const processedRows: any[] = [];
    const lateCounts: Record<string, number> = {};
    const trendMap: Record<string, number> = {};
    const shiftDistMap: Record<string, number> = {};

    jsonData.forEach((row: any) => {
        const rawName = row[nameCol];
        if (!rawName || rawName.toString().trim() === "" || rawName.toString().toLowerCase() === "nan") return;

        const name = rawName.toString().trim();
        const checkInTime = parseTime(row[checkinCol]);
        const shiftOrCode = shiftCol ? row[shiftCol]?.toString() : "";
        const orgVal = orgCol ? row[orgCol]?.toString() : "";
        const rawDate = dateCol ? row[dateCol] : "";
        const dateStr = rawDate instanceof Date ? rawDate.toLocaleDateString('id-ID') : rawDate?.toString() || "";

        // Default or Parsed Schedule
        let isOff = false;
        let scheduleTime = DEFAULT_WORK_START;
        let scheduleOutTime = DEFAULT_WORK_END;
        let originalScheduleTime = "";

        if (scheduleInCol) {
            const rawSched = row[scheduleInCol];
            const rawSchedStr = rawSched ? rawSched.toString().toLowerCase() : "";

            if (rawSchedStr.includes('off') || rawSchedStr.trim() === '') {
                isOff = true;
                scheduleTime = "";
            } else {
                const parsedSched = parseTime(rawSched);
                if (parsedSched) {
                    scheduleTime = parsedSched;
                    originalScheduleTime = parsedSched;
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

        if (!checkInTime) return;

        let finalScheduleIn = scheduleTime;
        let isShiftAdjusted = false;
        const checkInMin = timeToMinutes(checkInTime);
        let lateMinutes = 0;

        if (isOff || scheduleTime === "") {
            finalScheduleIn = findNearestShift(checkInMin, customShifts);
            isShiftAdjusted = true;
            originalScheduleTime = "OFF";
        }
        else {
            const schedMin = timeToMinutes(scheduleTime);
            let diff = checkInMin - schedMin;

            if (diff > lateThreshold) {
                // Skip adjustment for HO (OPERASIONAL) shift N
                const isHO = orgVal === "OPERASIONAL";
                const isShiftN = shiftOrCode === "N";

                if (!(isHO && isShiftN)) {
                    const nearestShiftStr = findNearestShift(checkInMin, customShifts);
                    const nearestShiftMin = timeToMinutes(nearestShiftStr);

                    if (Math.abs(checkInMin - nearestShiftMin) < Math.abs(diff)) {
                        finalScheduleIn = nearestShiftStr;
                        isShiftAdjusted = true;
                        diff = checkInMin - nearestShiftMin;
                    }
                }
            }
            lateMinutes = diff > 0 ? diff : 0;
        }

        if (isShiftAdjusted) {
            const newSchedMin = timeToMinutes(finalScheduleIn);
            const newDiff = checkInMin - newSchedMin;
            lateMinutes = newDiff > 0 ? newDiff : 0;
        }

        if (lateMinutes > 0 || isShiftAdjusted) {
            if (lateMinutes > 0) {
                if (!lateCounts[name]) lateCounts[name] = 0;
                lateCounts[name]++;

                if (dateStr) {
                    trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;
                }

                const shiftLabel = shiftOrCode || "None";
                shiftDistMap[shiftLabel] = (shiftDistMap[shiftLabel] || 0) + 1;
            }

            processedRows.push({
                id: Math.random().toString(36).substring(7),
                fullName: name,
                date: dateStr,
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
    })).sort((a, b) => a.fullName.localeCompare(b.fullName) || a.date.localeCompare(b.date));

    const totalCases = finalResults.filter(r => r.lateMinutes > 0).length;
    const totalEmployees = Object.keys(lateCounts).length;
    const avgPerEmployee = totalEmployees ? parseFloat((totalCases / totalEmployees).toFixed(2)) : 0;

    const top5 = Object.entries(lateCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    const trends = Object.entries(trendMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => {
            const [da, ma, ya] = a.date.split('/').map(Number);
            const [db, mb, yb] = b.date.split('/').map(Number);
            return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
        });

    const shiftDistribution = Object.entries(shiftDistMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return {
        data: finalResults,
        summary: {
            totalCases,
            totalEmployees,
            avgPerEmployee,
            top5,
            trends,
            shiftDistribution
        }
    };
}
