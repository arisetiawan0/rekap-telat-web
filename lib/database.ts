import { getSupabase } from './supabase';
import type { AttendanceRecord, SummaryStats, EmployeeSummary } from './types';
import { getSeverityLevel } from './utils';

// ============================================
// Types for DB rows
// ============================================
export interface SessionRow {
    id: string;
    file_name: string;
    processed_at: string;
    total_cases: number;
    total_employees: number;
    total_late_minutes: number;
    avg_late_minutes: number;
    summary_json: string;
}

export interface RecordRow {
    id: string;
    session_id: string;
    full_name: string;
    date: string;
    shift: string;
    schedule_in: string;
    schedule_out: string;
    check_in: string;
    check_out: string;
    late_minutes: number;
    total_late_count: number;
    is_shift_adjusted: boolean;
    original_schedule: string;
    organization: string;
    job_position: string;
    job_level: string;
    employment_status: string;
}

// ============================================
// Session CRUD
// ============================================

export async function createSession(
    fileName: string,
    summary: SummaryStats,
    records: AttendanceRecord[]
): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) {
        console.warn('Supabase not configured, skipping save');
        return null;
    }

    // 1. Insert session
    const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
            file_name: fileName,
            processed_at: new Date().toISOString(),
            total_cases: summary.totalCases,
            total_employees: summary.totalEmployees,
            total_late_minutes: summary.totalLateMinutes,
            avg_late_minutes: summary.avgLateMinutes,
            summary_json: JSON.stringify(summary),
        })
        .select('id')
        .single();

    if (sessionError || !session) {
        console.error('Failed to create session:', sessionError);
        return null;
    }

    const sessionId = session.id;

    // 2. Insert records in batches of 500
    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize).map(r => ({
            session_id: sessionId,
            full_name: r.fullName,
            date: r.date,
            shift: r.shift || '',
            schedule_in: r.scheduleIn,
            schedule_out: r.scheduleOut,
            check_in: r.checkIn,
            check_out: r.checkOut,
            late_minutes: r.lateMinutes,
            total_late_count: r.totalLateCount,
            is_shift_adjusted: r.isShiftAdjusted || false,
            original_schedule: r.originalSchedule || '',
            organization: r.organization || '',
            job_position: r.jobPosition || '',
            job_level: r.jobLevel || '',
            employment_status: r.employmentStatus || '',
        }));

        const { error: recordError } = await supabase
            .from('records')
            .insert(batch);

        if (recordError) {
            console.error('Failed to insert records batch:', recordError);
        }
    }

    return sessionId;
}

export async function getSessions(): Promise<SessionRow[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('processed_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch sessions:', error);
        return [];
    }

    return data || [];
}

export async function getSessionById(id: string): Promise<{
    session: SessionRow;
    records: AttendanceRecord[];
    summary: SummaryStats;
} | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    // Fetch session
    const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

    if (sessionError || !session) {
        console.error('Failed to fetch session:', sessionError);
        return null;
    }

    // Fetch records
    const { data: dbRecords, error: recordError } = await supabase
        .from('records')
        .select('*')
        .eq('session_id', id)
        .order('full_name', { ascending: true })
        .order('date', { ascending: true });

    if (recordError) {
        console.error('Failed to fetch records:', recordError);
        return null;
    }

    // Map DB records to AttendanceRecord
    const records: AttendanceRecord[] = (dbRecords || []).map((r: RecordRow) => ({
        id: r.id,
        fullName: r.full_name,
        date: r.date,
        shift: r.shift,
        scheduleIn: r.schedule_in,
        scheduleOut: r.schedule_out,
        checkIn: r.check_in,
        checkOut: r.check_out,
        lateMinutes: r.late_minutes,
        totalLateCount: r.total_late_count,
        isShiftAdjusted: r.is_shift_adjusted,
        originalSchedule: r.original_schedule,
        organization: r.organization,
        jobPosition: r.job_position,
        jobLevel: r.job_level,
        employmentStatus: r.employment_status,
    }));

    // Parse summary from JSON
    let summary: SummaryStats;
    try {
        summary = JSON.parse(session.summary_json);
    } catch {
        console.error('Failed to parse summary JSON');
        return null;
    }

    return { session, records, summary };
}

export async function deleteSession(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    // Delete records first (FK cascade handles this, but being explicit)
    const { error: recordError } = await supabase
        .from('records')
        .delete()
        .eq('session_id', id);

    if (recordError) {
        console.error('Failed to delete records:', recordError);
        return false;
    }

    const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

    if (sessionError) {
        console.error('Failed to delete session:', sessionError);
        return false;
    }

    return true;
}

// ============================================
// Aggregated Employee Data (Cross-Session)
// ============================================

export async function getAllEmployeesAggregated(): Promise<EmployeeSummary[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    // Fetch all records from all sessions
    // Supabase has a default limit of 1000 rows, so we paginate
    let allRecords: RecordRow[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('records')
            .select('full_name, date, late_minutes, organization, job_position, job_level')
            .order('full_name', { ascending: true })
            .range(from, from + pageSize - 1);

        if (error) {
            console.error('Failed to fetch records for aggregation:', error);
            break;
        }

        if (data && data.length > 0) {
            allRecords = allRecords.concat(data as RecordRow[]);
            from += pageSize;
            hasMore = data.length === pageSize;
        } else {
            hasMore = false;
        }
    }

    if (allRecords.length === 0) return [];

    // Aggregate by employee name
    const employeeMap = new Map<string, {
        name: string;
        organization: string;
        jobPosition: string;
        jobLevel: string;
        totalLateMinutes: number;
        dates: Set<string>;
    }>();

    for (const r of allRecords) {
        const key = r.full_name;
        if (!employeeMap.has(key)) {
            employeeMap.set(key, {
                name: r.full_name,
                organization: r.organization || '',
                jobPosition: r.job_position || '',
                jobLevel: r.job_level || '',
                totalLateMinutes: 0,
                dates: new Set(),
            });
        }
        const emp = employeeMap.get(key)!;
        emp.totalLateMinutes += r.late_minutes;
        if (r.date) emp.dates.add(r.date);
        // Update org/position if previously empty
        if (!emp.organization && r.organization) emp.organization = r.organization;
        if (!emp.jobPosition && r.job_position) emp.jobPosition = r.job_position;
    }

    // Convert to EmployeeSummary array, sorted by total count desc
    const employees: EmployeeSummary[] = Array.from(employeeMap.values())
        .map(emp => {
            const totalLateCount = emp.dates.size;
            const avgLateMinutes = totalLateCount > 0 ? Math.round(emp.totalLateMinutes / totalLateCount) : 0;
            return {
                name: emp.name,
                organization: emp.organization,
                jobPosition: emp.jobPosition,
                jobLevel: emp.jobLevel,
                totalLateCount,
                totalLateMinutes: emp.totalLateMinutes,
                avgLateMinutes,
                dates: Array.from(emp.dates).sort(),
                severity: getSeverityLevel(avgLateMinutes),
            };
        })
        .sort((a, b) => b.totalLateCount - a.totalLateCount);

    return employees;
}
