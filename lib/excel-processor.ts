import * as XLSX from 'xlsx';
import type {
    AttendanceRecord,
    EmployeeSummary,
    SummaryStats,
    ProcessingResult,
} from './types';
import { getSeverityLevel } from './utils';

// ============================================
// Constants
// ============================================
const DEFAULT_WORK_START = '08:00';
const DEFAULT_WORK_END = '17:00';

// ============================================
// Column Detection
// ============================================
function findColumn(row: Record<string, unknown>, candidates: string[]): string | undefined {
    const keys = Object.keys(row);
    for (const c of candidates) {
        const norm = c.toLowerCase().trim();
        const found = keys.find(k => k.toLowerCase().trim() === norm);
        if (found) return found;
    }
    return undefined;
}

// ============================================
// Time Parsing
// ============================================
function parseTime(val: unknown): string | null {
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

// ============================================
// Nearest Shift Detection
// ============================================
function findNearestShift(checkInMinutes: number, knownShifts: string[]): string {
    const shiftsArr = knownShifts.length > 0 ? knownShifts : [
        '06:00', '06:30', '06:45', '07:00', '07:45',
        '09:00', '10:00', '11:00', '12:00', '13:00',
        '13:15', '13:45', '14:30', '14:45', '15:00',
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

// ============================================
// Main Processor
// ============================================
export async function processExcelFile(
    file: File,
    customShifts: string[] = [],
    lateThreshold: number = 130
): Promise<ProcessingResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];

    if (jsonData.length === 0) {
        throw new Error('File kosong atau tidak dapat dibaca.');
    }

    const firstRow = jsonData[0];

    // Identify columns
    const nameCol = findColumn(firstRow, ['Full Name', 'Employee Name', 'Name', 'Nama']);
    const dateCol = findColumn(firstRow, ['Date*', 'Date', 'Attendance Date', 'Tanggal']);
    const shiftCol = findColumn(firstRow, ['Shift', 'Shift Code', 'Working Shift Code']);
    const checkinCol = findColumn(firstRow, ['Check In', 'Clock In', 'In Time', 'Jam Masuk']);
    const scheduleInCol = findColumn(firstRow, ['Schedule In', 'Shift In', 'Jam Masuk Jadwal']);
    const scheduleOutCol = findColumn(firstRow, ['Schedule Out', 'Shift Out', 'Jam Pulang Jadwal']);
    const checkoutCol = findColumn(firstRow, ['Check Out', 'Clock Out', 'Out Time', 'Jam Pulang']);
    const orgCol = findColumn(firstRow, ['Organization', 'Organisasi', 'Org']);
    const jobPosCol = findColumn(firstRow, ['Job Position', 'Jabatan', 'Position']);
    const jobLevelCol = findColumn(firstRow, ['Job Level', 'Level', 'Grade']);
    const empStatusCol = findColumn(firstRow, ['Employment Status', 'Status Karyawan', 'Status']);

    if (!nameCol || !checkinCol) {
        throw new Error('Kolom wajib (Nama / Check In) tidak ditemukan dalam file.');
    }

    const processedRows: AttendanceRecord[] = [];
    const lateCounts: Record<string, number> = {};
    const lateMinutesMap: Record<string, number> = {};
    const trendMap: Record<string, number> = {};
    const shiftDistMap: Record<string, number> = {};
    const orgDistMap: Record<string, number> = {};
    const employeeMeta: Record<string, { org: string; pos: string; level: string; dates: string[] }> = {};

    let severityRingan = 0;
    let severitySedang = 0;
    let severityBerat = 0;

    jsonData.forEach((row) => {
        const rawName = row[nameCol];
        if (!rawName || rawName.toString().trim() === '' || rawName.toString().toLowerCase() === 'nan') return;

        const name = rawName.toString().trim();
        const checkInTime = parseTime(row[checkinCol]);
        const shiftOrCode = shiftCol ? row[shiftCol]?.toString() || '' : '';
        const orgVal = orgCol ? row[orgCol]?.toString().trim() || '' : '';
        const jobPosVal = jobPosCol ? row[jobPosCol]?.toString().trim() || '' : '';
        const jobLevelVal = jobLevelCol ? row[jobLevelCol]?.toString().trim() || '' : '';
        const empStatusVal = empStatusCol ? row[empStatusCol]?.toString().trim() || '' : '';
        const rawDate = dateCol ? row[dateCol] : '';
        const dateStr = rawDate instanceof Date
            ? rawDate.toLocaleDateString('id-ID')
            : rawDate?.toString() || '';

        // Default or Parsed Schedule
        let isOff = false;
        let scheduleTime = DEFAULT_WORK_START;
        let scheduleOutTime = DEFAULT_WORK_END;
        let originalScheduleTime = '';

        if (scheduleInCol) {
            const rawSched = row[scheduleInCol];
            const rawSchedStr = rawSched ? rawSched.toString().toLowerCase() : '';

            if (rawSchedStr.includes('off') || rawSchedStr.trim() === '') {
                isOff = true;
                scheduleTime = '';
            } else {
                const parsedSched = parseTime(rawSched);
                if (parsedSched) {
                    scheduleTime = parsedSched;
                    originalScheduleTime = parsedSched;
                    if (scheduleTime === '00:00') {
                        isOff = true;
                        scheduleTime = '';
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

        if (isOff || scheduleTime === '') {
            finalScheduleIn = findNearestShift(checkInMin, customShifts);
            isShiftAdjusted = true;
            originalScheduleTime = 'OFF';
        } else {
            const schedMin = timeToMinutes(scheduleTime);
            let diff = checkInMin - schedMin;

            if (diff > lateThreshold) {
                const isShiftN = shiftOrCode?.toUpperCase().includes('N');

                if (!isShiftN) {
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
                lateCounts[name] = (lateCounts[name] || 0) + 1;
                lateMinutesMap[name] = (lateMinutesMap[name] || 0) + lateMinutes;

                if (dateStr) trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;

                const shiftLabel = shiftOrCode || 'None';
                shiftDistMap[shiftLabel] = (shiftDistMap[shiftLabel] || 0) + 1;

                if (orgVal) orgDistMap[orgVal] = (orgDistMap[orgVal] || 0) + 1;

                // Severity
                const sev = getSeverityLevel(lateMinutes);
                if (sev === 'ringan') severityRingan++;
                else if (sev === 'sedang') severitySedang++;
                else severityBerat++;

                // Employee meta
                if (!employeeMeta[name]) {
                    employeeMeta[name] = { org: orgVal, pos: jobPosVal, level: jobLevelVal, dates: [] };
                }
                if (dateStr) employeeMeta[name].dates.push(dateStr);
            }

            processedRows.push({
                id: Math.random().toString(36).substring(7),
                fullName: name,
                date: dateStr,
                shift: shiftOrCode,
                scheduleIn: finalScheduleIn,
                scheduleOut: scheduleOutTime,
                checkIn: checkInTime,
                checkOut: checkoutCol ? (parseTime(row[checkoutCol]) || row[checkoutCol]?.toString() || '') : '',
                lateMinutes,
                totalLateCount: 0,
                isShiftAdjusted,
                originalSchedule: originalScheduleTime,
                organization: orgVal,
                jobPosition: jobPosVal,
                jobLevel: jobLevelVal,
                employmentStatus: empStatusVal,
            });
        }
    });

    // Attach total late counts
    const finalResults: AttendanceRecord[] = processedRows
        .map(r => ({ ...r, totalLateCount: lateCounts[r.fullName] || 0 }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName) || a.date.localeCompare(b.date));

    // Summary
    const totalCases = finalResults.filter(r => r.lateMinutes > 0).length;
    const totalEmployees = Object.keys(lateCounts).length;
    const avgPerEmployee = totalEmployees ? parseFloat((totalCases / totalEmployees).toFixed(2)) : 0;
    const totalLateMinutes = Object.values(lateMinutesMap).reduce((a, b) => a + b, 0);
    const avgLateMinutes = totalCases ? parseFloat((totalLateMinutes / totalCases).toFixed(1)) : 0;

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

    const organizationDistribution = Object.entries(orgDistMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const severityBreakdown = [
        { name: 'Ringan (≤15m)', value: severityRingan, color: '#34d399' },
        { name: 'Sedang (16-60m)', value: severitySedang, color: '#fbbf24' },
        { name: 'Berat (>60m)', value: severityBerat, color: '#f87171' },
    ];

    // Employee summaries
    const employeeSummaries: EmployeeSummary[] = Object.entries(lateCounts)
        .map(([name, count]) => {
            const totalMin = lateMinutesMap[name] || 0;
            const meta = employeeMeta[name] || { org: '', pos: '', level: '', dates: [] };
            return {
                name,
                organization: meta.org,
                jobPosition: meta.pos,
                jobLevel: meta.level,
                totalLateCount: count,
                totalLateMinutes: totalMin,
                avgLateMinutes: count > 0 ? parseFloat((totalMin / count).toFixed(1)) : 0,
                dates: meta.dates,
                severity: getSeverityLevel(count > 0 ? totalMin / count : 0),
            };
        })
        .sort((a, b) => b.totalLateCount - a.totalLateCount);

    return {
        data: finalResults,
        summary: {
            totalCases,
            totalEmployees,
            avgPerEmployee,
            totalLateMinutes,
            avgLateMinutes,
            top5,
            trends,
            shiftDistribution,
            organizationDistribution,
            severityBreakdown,
            employeeSummaries,
        },
        meta: {
            fileName: file.name,
            processedAt: new Date().toISOString(),
            totalRows: jsonData.length,
            filteredRows: finalResults.length,
        },
    };
}
