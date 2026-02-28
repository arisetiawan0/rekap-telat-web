import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import type { AttendanceRecord } from './types';

// ============================================
// Class Name Helper
// ============================================
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ============================================
// Time & Date Formatting
// ============================================
export function formatTime(timeStr: string): string {
    if (!timeStr || timeStr === '00:00') return '-';
    return timeStr;
}

export function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    // If already formatted as dd/mm/yyyy
    if (dateStr.includes('/')) return dateStr;
    // If ISO format
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

export function getSeverityLevel(minutes: number): 'ringan' | 'sedang' | 'berat' {
    if (minutes <= 15) return 'ringan';
    if (minutes <= 60) return 'sedang';
    return 'berat';
}

export function getSeverityColor(severity: string): string {
    switch (severity) {
        case 'ringan': return 'text-emerald-400';
        case 'sedang': return 'text-amber-400';
        case 'berat': return 'text-red-400';
        default: return 'text-gray-400';
    }
}

export function getSeverityBg(severity: string): string {
    switch (severity) {
        case 'ringan': return 'bg-emerald-400/10 border-emerald-400/20';
        case 'sedang': return 'bg-amber-400/10 border-amber-400/20';
        case 'berat': return 'bg-red-400/10 border-red-400/20';
        default: return 'bg-gray-400/10 border-gray-400/20';
    }
}

// ============================================
// Export Helpers
// ============================================
export function exportToExcel(data: AttendanceRecord[], filename?: string) {
    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
        'Nama Lengkap': item.fullName,
        'Tanggal': item.date,
        'Organisasi': item.organization || '-',
        'Jabatan': item.jobPosition || '-',
        'Shift': item.shift,
        'Jadwal Masuk': item.scheduleIn,
        'Jadwal Pulang': item.scheduleOut,
        'Check In': item.checkIn,
        'Check Out': item.checkOut,
        'Telat (Menit)': item.lateMinutes,
        'Status Shift': item.isShiftAdjusted ? `Disesuaikan (${item.originalSchedule || 'OFF'})` : 'Sesuai',
        'Total Keterlambatan': item.totalLateCount,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Telat');
    XLSX.writeFile(wb, filename || `rekap_telat_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToCSV(data: AttendanceRecord[], filename?: string) {
    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
        'Nama Lengkap': item.fullName,
        'Tanggal': item.date,
        'Organisasi': item.organization || '-',
        'Shift': item.shift,
        'Jadwal Masuk': item.scheduleIn,
        'Check In': item.checkIn,
        'Telat (Menit)': item.lateMinutes,
        'Total Keterlambatan': item.totalLateCount,
    })));
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || `rekap_telat_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ============================================
// Initials Generator
// ============================================
export function getInitials(name: string): string {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================
// Color Palette for Charts
// ============================================
export const CHART_COLORS = [
    '#22d3ee', '#818cf8', '#f472b6', '#fbbf24',
    '#34d399', '#a78bfa', '#fb923c', '#e879f9',
    '#2dd4bf', '#f87171',
];

export function getChartColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length];
}

// ============================================
// Period Comparison Helpers
// ============================================

export function formatPercentChange(oldVal: number, newVal: number): { text: string; isPositive: boolean; isNeutral: boolean } {
    if (oldVal === 0 && newVal === 0) return { text: '0%', isPositive: false, isNeutral: true };
    if (oldVal === 0) return { text: '+100%', isPositive: false, isNeutral: false };
    const change = ((newVal - oldVal) / oldVal) * 100;
    const rounded = Math.abs(change) < 0.1 ? 0 : +change.toFixed(1);
    if (rounded === 0) return { text: '0%', isPositive: false, isNeutral: true };
    // For lateness, decrease is positive (good)
    return {
        text: `${rounded > 0 ? '+' : ''}${rounded}%`,
        isPositive: rounded < 0, // decrease in lateness is good
        isNeutral: false,
    };
}

export function computePeriodStats(records: AttendanceRecord[]) {
    const employeeMap = new Map<string, {
        name: string;
        organization: string;
        jobPosition: string;
        jobLevel: string;
        totalLateMinutes: number;
        dates: string[];
        count: number;
    }>();

    for (const r of records) {
        if (!employeeMap.has(r.fullName)) {
            employeeMap.set(r.fullName, {
                name: r.fullName,
                organization: r.organization || '',
                jobPosition: r.jobPosition || '',
                jobLevel: r.jobLevel || '',
                totalLateMinutes: 0,
                dates: [],
                count: 0,
            });
        }
        const emp = employeeMap.get(r.fullName)!;
        emp.totalLateMinutes += r.lateMinutes;
        emp.dates.push(r.date);
        emp.count++;
    }

    const totalCases = records.length;
    const totalEmployees = employeeMap.size;
    const avgPerEmployee = totalEmployees > 0 ? +(totalCases / totalEmployees).toFixed(2) : 0;
    const totalLateMinutes = records.reduce((sum, r) => sum + r.lateMinutes, 0);
    const avgLateMinutes = totalCases > 0 ? +(totalLateMinutes / totalCases).toFixed(1) : 0;

    // Top 5
    const top5 = Array.from(employeeMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(e => ({ name: e.name, count: e.count }));

    // Trends
    const trendMap = new Map<string, number>();
    for (const r of records) {
        trendMap.set(r.date, (trendMap.get(r.date) || 0) + 1);
    }
    const trends = Array.from(trendMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Shift distribution
    const shiftMap = new Map<string, number>();
    for (const r of records) {
        const s = r.shift || 'N/A';
        shiftMap.set(s, (shiftMap.get(s) || 0) + 1);
    }
    const shiftDistribution = Array.from(shiftMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Severity breakdown
    let ringan = 0, sedang = 0, berat = 0;
    for (const r of records) {
        const s = getSeverityLevel(r.lateMinutes);
        if (s === 'ringan') ringan++;
        else if (s === 'sedang') sedang++;
        else berat++;
    }
    const severityBreakdown = [
        { name: 'Ringan', value: ringan, color: '#34d399' },
        { name: 'Sedang', value: sedang, color: '#fbbf24' },
        { name: 'Berat', value: berat, color: '#f87171' },
    ];

    // Employee summaries
    const employeeSummaries = Array.from(employeeMap.values())
        .map(emp => ({
            name: emp.name,
            organization: emp.organization,
            jobPosition: emp.jobPosition,
            jobLevel: emp.jobLevel,
            totalLateCount: emp.count,
            totalLateMinutes: emp.totalLateMinutes,
            avgLateMinutes: emp.count > 0 ? Math.round(emp.totalLateMinutes / emp.count) : 0,
            dates: emp.dates,
            severity: getSeverityLevel(emp.count > 0 ? Math.round(emp.totalLateMinutes / emp.count) : 0),
        }))
        .sort((a, b) => b.totalLateCount - a.totalLateCount);

    return {
        totalCases,
        totalEmployees,
        avgPerEmployee,
        totalLateMinutes,
        avgLateMinutes,
        top5,
        trends,
        shiftDistribution,
        severityBreakdown,
        employeeSummaries,
    };
}
