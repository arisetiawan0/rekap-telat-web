// ============================================
// Rekap Keterlambatan — Centralized Types
// ============================================

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
    organization?: string;
    jobPosition?: string;
    jobLevel?: string;
    employmentStatus?: string;
}

export interface EmployeeSummary {
    name: string;
    organization: string;
    jobPosition: string;
    jobLevel: string;
    totalLateCount: number;
    totalLateMinutes: number;
    avgLateMinutes: number;
    dates: string[];
    severity: 'ringan' | 'sedang' | 'berat';
}

export interface SummaryStats {
    totalCases: number;
    totalEmployees: number;
    avgPerEmployee: number;
    totalLateMinutes: number;
    avgLateMinutes: number;
    top5: { name: string; count: number }[];
    trends: { date: string; count: number }[];
    shiftDistribution: { name: string; value: number }[];
    organizationDistribution: { name: string; value: number }[];
    severityBreakdown: { name: string; value: number; color: string }[];
    employeeSummaries: EmployeeSummary[];
}

export interface AppSettings {
    shifts: string[];
    threshold: number;
}

export interface ProcessingResult {
    data: AttendanceRecord[];
    summary: SummaryStats;
    meta: {
        fileName: string;
        processedAt: string;
        totalRows: number;
        filteredRows: number;
    };
}

export interface HistoryEntry {
    id: string;
    fileName: string;
    processedAt: string;
    totalCases: number;
    totalEmployees: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
    key: keyof AttendanceRecord;
    direction: SortDirection;
}

export interface FilterState {
    search: string;
    organization: string;
    shift: string;
    severity: string;
    dateFrom: string;
    dateTo: string;
}
