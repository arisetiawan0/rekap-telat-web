import type { AttendanceRecord, SummaryStats, EmployeeSummary } from './types';
import type { SummaryStats as SessionSummaryStats } from './types';

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
        cache: 'no-store',
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
        const message = payload && typeof payload === 'object' && 'error' in payload
            ? String(payload.error)
            : `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    return payload as T;
}

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

export async function createSession(
    fileName: string,
    summary: SummaryStats,
    records: AttendanceRecord[]
): Promise<string | null> {
    try {
        const result = await requestJson<{ id: string }>('/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ fileName, summary, records }),
        });
        return result.id;
    } catch (error) {
        console.error('Failed to create session:', error instanceof Error ? error.message : error);
        return null;
    }
}

export async function getSessions(): Promise<SessionRow[]> {
    return requestJson<SessionRow[]>('/api/sessions');
}

export async function getSessionById(id: string): Promise<{
    session: SessionRow;
    records: AttendanceRecord[];
    summary: SessionSummaryStats;
} | null> {
    try {
        return await requestJson<{
            session: SessionRow;
            records: AttendanceRecord[];
            summary: SessionSummaryStats;
        }>(`/api/sessions/${id}`);
    } catch (error) {
        console.error('Failed to fetch session:', error instanceof Error ? error.message : error);
        return null;
    }
}

export async function deleteSession(id: string): Promise<boolean> {
    try {
        await requestJson<{ success: boolean }>(`/api/sessions/${id}`, { method: 'DELETE' });
        return true;
    } catch (error) {
        console.error('Failed to delete session:', error instanceof Error ? error.message : error);
        return false;
    }
}

export async function getAllEmployeesAggregated(): Promise<EmployeeSummary[]> {
    return requestJson<EmployeeSummary[]>('/api/employees');
}

export async function getRecordsByDateRange(
    dateFrom: string,
    dateTo: string
): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams({ from: dateFrom, to: dateTo });
    return requestJson<AttendanceRecord[]>(`/api/records?${params.toString()}`);
}
