import * as XLSX from 'xlsx';

export interface AttendanceRecord {
    id: string;
    fullName: string;
    date: string;
    scheduleIn: string;
    scheduleOut: string;
    checkIn: string;
    checkOut: string;
    lateMinutes: number;
    totalLateCount: number;
}

export interface SummaryStats {
    totalCases: number;
    totalEmployees: number;
    avgPerEmployee: number;
    top5: { name: string; count: number }[];
}

const DEFAULT_WORK_START = "08:00";
const DEFAULT_WORK_END = "17:00";

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
 * Excel can store time as:
 * 1. Decimal (fraction of day, e.g. 0.33333)
 * 2. Formatted string "HH:MM"
 * 3. Date object (if cellDates: true)
 */
function parseTime(val: any): string | null {
    if (val === null || val === undefined) return null;

    // If it's a number (Excel serial date/time), convert to HH:MM
    if (typeof val === 'number') {
        // Excel time is fraction of day
        const totalSeconds = Math.round(val * 24 * 3600);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // If it's a string, try to parse HH:MM
    if (typeof val === 'string') {
        const trimmed = val.trim();
        // Matches HH:MM or HH:MM:SS
        const match = trimmed.match(/(\d{1,2}):(\d{2})/);
        if (match) {
            const h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
    }

    // If Date object
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

export async function processExcelFile(file: File): Promise<{
    data: AttendanceRecord[];
    summary: SummaryStats;
}> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true }); // cellDates handles some date formats automatically
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (jsonData.length === 0) {
        throw new Error("File kosong atau tidak dapat dibaca.");
    }

    const firstRow = jsonData[0];

    // Identifikasi kolom
    const nameCol = findColumn(firstRow, ["Full Name", "Employee Name", "Name", "Nama"]);
    const dateCol = findColumn(firstRow, ["Date*", "Date", "Attendance Date", "Tanggal"]);
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

        // Schedule In (optional)
        let scheduleTime = DEFAULT_WORK_START;
        if (scheduleInCol) {
            const parsedSched = parseTime(row[scheduleInCol]);
            if (parsedSched) scheduleTime = parsedSched;
        }

        // Schedule Out (optional)
        let scheduleOutTime = DEFAULT_WORK_END;
        if (scheduleOutCol) {
            const parsedSchedOut = parseTime(row[scheduleOutCol]);
            if (parsedSchedOut) scheduleOutTime = parsedSchedOut;
        }

        if (!checkInTime) return; // Skip invalid checkin

        // Calculate Late
        const actualMin = timeToMinutes(checkInTime);
        const schedMin = timeToMinutes(scheduleTime);
        const diff = actualMin - schedMin;
        const lateMinutes = diff > 0 ? diff : 0;

        if (lateMinutes > 0) {
            if (!lateCounts[name]) lateCounts[name] = 0;
            lateCounts[name]++;

            processedRows.push({
                id: Math.random().toString(36).substring(7),
                fullName: name,
                date: dateCol ? (row[dateCol] instanceof Date ? row[dateCol].toLocaleDateString('id-ID') : row[dateCol]?.toString() || "") : "",
                scheduleIn: scheduleTime,
                scheduleOut: scheduleOutTime,
                checkIn: checkInTime,
                checkOut: checkoutCol ? (parseTime(row[checkoutCol]) || row[checkoutCol]?.toString() || "") : "",
                lateMinutes: lateMinutes,
                totalLateCount: 0 // Will fill later
            });
        }
    });

    // Fill in totalLateCount
    const finalResults: AttendanceRecord[] = processedRows.map(r => ({
        ...r,
        totalLateCount: lateCounts[r.fullName] || 0
    })).sort((a, b) => {
        // Sort by Name then Date (simple string sort for date currently)
        return a.fullName.localeCompare(b.fullName) || a.date.localeCompare(b.date);
    });

    // Summary
    const totalCases = finalResults.length;
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
