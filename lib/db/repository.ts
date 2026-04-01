import 'server-only';

import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import type { AttendanceRecord, EmployeeSummary, SummaryStats } from '@/lib/types';
import { getSeverityLevel } from '@/lib/utils';
import type { SessionRow } from '@/lib/database';
import { getDb } from './client';
import { records, sessions } from './schema';

function mapSessionRow(row: typeof sessions.$inferSelect): SessionRow {
    return {
        id: row.id,
        file_name: row.fileName,
        processed_at: row.processedAt,
        total_cases: row.totalCases,
        total_employees: row.totalEmployees,
        total_late_minutes: row.totalLateMinutes,
        avg_late_minutes: row.avgLateMinutes,
        summary_json: JSON.stringify(row.summaryJson),
    };
}

function mapAttendanceRecord(row: typeof records.$inferSelect): AttendanceRecord {
    return {
        id: row.id,
        fullName: row.fullName,
        date: row.date,
        shift: row.shift,
        scheduleIn: row.scheduleIn,
        scheduleOut: row.scheduleOut,
        checkIn: row.checkIn,
        checkOut: row.checkOut,
        lateMinutes: row.lateMinutes,
        totalLateCount: row.totalLateCount,
        isShiftAdjusted: row.isShiftAdjusted,
        originalSchedule: row.originalSchedule,
        organization: row.organization,
        jobPosition: row.jobPosition,
        jobLevel: row.jobLevel,
        employmentStatus: row.employmentStatus,
    };
}

export async function createSessionRecord(
    fileName: string,
    summary: SummaryStats,
    attendanceRecords: AttendanceRecord[]
) {
    const db = getDb();
    const sessionId = crypto.randomUUID();
    const processedAt = new Date().toISOString();

    await db.transaction(async (tx) => {
        await tx.insert(sessions).values({
            id: sessionId,
            fileName,
            processedAt,
            totalCases: summary.totalCases,
            totalEmployees: summary.totalEmployees,
            totalLateMinutes: summary.totalLateMinutes,
            avgLateMinutes: summary.avgLateMinutes,
            summaryJson: summary,
        });

        const batchSize = 500;

        for (let i = 0; i < attendanceRecords.length; i += batchSize) {
            const batch = attendanceRecords.slice(i, i + batchSize);

            if (batch.length === 0) continue;

            await tx.insert(records).values(batch.map((record) => ({
                id: record.id || crypto.randomUUID(),
                sessionId,
                fullName: record.fullName,
                date: record.date,
                shift: record.shift || '',
                scheduleIn: record.scheduleIn,
                scheduleOut: record.scheduleOut,
                checkIn: record.checkIn,
                checkOut: record.checkOut,
                lateMinutes: record.lateMinutes,
                totalLateCount: record.totalLateCount,
                isShiftAdjusted: record.isShiftAdjusted || false,
                originalSchedule: record.originalSchedule || '',
                organization: record.organization || '',
                jobPosition: record.jobPosition || '',
                jobLevel: record.jobLevel || '',
                employmentStatus: record.employmentStatus || '',
            })));
        }
    });

    return sessionId;
}

export async function listSessions() {
    const db = getDb();
    const rows = await db.select().from(sessions).orderBy(desc(sessions.processedAt));
    return rows.map(mapSessionRow);
}

export async function getSessionDetail(id: string): Promise<{
    session: SessionRow;
    records: AttendanceRecord[];
    summary: SummaryStats;
} | null> {
    const db = getDb();
    const [sessionRow] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);

    if (!sessionRow) return null;

    const recordRows = await db
        .select()
        .from(records)
        .where(eq(records.sessionId, id))
        .orderBy(asc(records.fullName), asc(records.date));

    return {
        session: mapSessionRow(sessionRow),
        records: recordRows.map(mapAttendanceRecord),
        summary: sessionRow.summaryJson,
    };
}

export async function removeSessionRecord(id: string) {
    const db = getDb();
    await db.delete(records).where(eq(records.sessionId, id));
    const result = await db.delete(sessions).where(eq(sessions.id, id));
    return (result.rowsAffected ?? 0) > 0;
}

export async function listEmployeesAggregated(): Promise<EmployeeSummary[]> {
    const db = getDb();
    const rows = await db
        .select({
            fullName: records.fullName,
            date: records.date,
            lateMinutes: records.lateMinutes,
            organization: records.organization,
            jobPosition: records.jobPosition,
            jobLevel: records.jobLevel,
        })
        .from(records)
        .orderBy(asc(records.fullName));

    if (rows.length === 0) return [];

    const employeeMap = new Map<string, {
        name: string;
        organization: string;
        jobPosition: string;
        jobLevel: string;
        totalLateMinutes: number;
        dates: Set<string>;
    }>();

    for (const row of rows) {
        const key = row.fullName;

        if (!employeeMap.has(key)) {
            employeeMap.set(key, {
                name: row.fullName,
                organization: row.organization || '',
                jobPosition: row.jobPosition || '',
                jobLevel: row.jobLevel || '',
                totalLateMinutes: 0,
                dates: new Set(),
            });
        }

        const employee = employeeMap.get(key)!;
        employee.totalLateMinutes += row.lateMinutes;
        if (row.date) employee.dates.add(row.date);
        if (!employee.organization && row.organization) employee.organization = row.organization;
        if (!employee.jobPosition && row.jobPosition) employee.jobPosition = row.jobPosition;
        if (!employee.jobLevel && row.jobLevel) employee.jobLevel = row.jobLevel;
    }

    return Array.from(employeeMap.values())
        .map((employee) => {
            const totalLateCount = employee.dates.size;
            const avgLateMinutes = totalLateCount > 0
                ? Math.round(employee.totalLateMinutes / totalLateCount)
                : 0;

            return {
                name: employee.name,
                organization: employee.organization,
                jobPosition: employee.jobPosition,
                jobLevel: employee.jobLevel,
                totalLateCount,
                totalLateMinutes: employee.totalLateMinutes,
                avgLateMinutes,
                dates: Array.from(employee.dates).sort(),
                severity: getSeverityLevel(avgLateMinutes),
            };
        })
        .sort((a, b) => b.totalLateCount - a.totalLateCount);
}

export async function listRecordsByDateRange(dateFrom: string, dateTo: string) {
    const db = getDb();
    const conditions = [];

    if (dateFrom) conditions.push(gte(records.date, dateFrom));
    if (dateTo) conditions.push(lte(records.date, dateTo));

    const whereClause = conditions.length > 1
        ? and(...conditions)
        : conditions[0];

    const rows = whereClause
        ? await db.select().from(records).where(whereClause).orderBy(asc(records.fullName), asc(records.date))
        : await db.select().from(records).orderBy(asc(records.fullName), asc(records.date));

    return rows.map(mapAttendanceRecord);
}
