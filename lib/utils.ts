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
