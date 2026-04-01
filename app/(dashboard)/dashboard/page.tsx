'use client';

import { useData } from '@/lib/context';
import SummaryCards from '@/components/SummaryCards';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ResultsTable from '@/components/ResultsTable';
import { motion } from 'framer-motion';
import { Upload, ArrowRight, BarChart3, Table2, CalendarRange, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { AttendanceRecord, SummaryStats, EmployeeSummary } from '@/lib/types';
import { getSeverityLevel } from '@/lib/utils';

type TabKey = 'analytics' | 'data';

// Recompute summary stats from filtered data
function computeFilteredSummary(records: AttendanceRecord[]): SummaryStats {
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

    // Organization distribution
    const orgMap = new Map<string, number>();
    for (const r of records) {
        const o = r.organization || 'N/A';
        orgMap.set(o, (orgMap.get(o) || 0) + 1);
    }
    const organizationDistribution = Array.from(orgMap.entries())
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
        { name: 'Ringan (≤15m)', value: ringan, color: '#34d399' },
        { name: 'Sedang (16-60m)', value: sedang, color: '#fbbf24' },
        { name: 'Berat (>60m)', value: berat, color: '#f87171' },
    ];

    // Employee summaries
    const employeeSummaries: EmployeeSummary[] = Array.from(employeeMap.values())
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
        organizationDistribution,
        severityBreakdown,
        employeeSummaries,
    };
}

export default function DashboardPage() {
    const { data, summary } = useData();
    const [activeTab, setActiveTab] = useState<TabKey>('analytics');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Date filtered data
    const { filteredData, filteredSummary, isFiltered } = useMemo(() => {
        if (!dateFrom && !dateTo) {
            return { filteredData: data, filteredSummary: summary, isFiltered: false };
        }
        const filtered = data.filter(r => {
            if (dateFrom && r.date < dateFrom) return false;
            if (dateTo && r.date > dateTo) return false;
            return true;
        });
        return {
            filteredData: filtered,
            filteredSummary: filtered.length > 0 ? computeFilteredSummary(filtered) : null,
            isFiltered: true,
        };
    }, [data, summary, dateFrom, dateTo]);

    const clearDateFilter = () => {
        setDateFrom('');
        setDateTo('');
    };

    // Empty state
    if (data.length === 0 || !summary) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                >
                    <div className="w-20 h-20 mx-auto bg-zinc-800/50 rounded-2xl flex items-center justify-center">
                        <Upload className="w-8 h-8 text-zinc-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Belum Ada Data</h2>
                        <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                            Upload file absensi Excel terlebih dahulu untuk melihat dashboard analitik
                        </p>
                    </div>
                    <Link
                        href="/upload"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-semibold border border-cyan-500/20 transition-colors"
                    >
                        Upload File
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </motion.div>
            </div>
        );
    }

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
        { key: 'data', label: 'Data Tabel', icon: <Table2 className="w-4 h-4" />, count: filteredData.length },
    ];

    // Get unique dates for date range hints
    const dates = data.map(r => r.date).filter(Boolean).sort();
    const minDate = dates[0] || '';
    const maxDate = dates[dates.length - 1] || '';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Overview analitik keterlambatan — {filteredData.length} record
                        {isFiltered && <span className="text-cyan-500"> (filtered)</span>}
                    </p>
                </div>
                <Link
                    href="/employees"
                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-white/3 hover:bg-white/6 rounded-xl border border-white/6 transition-all flex items-center gap-2"
                >
                    Lihat Karyawan
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Date Filter + Tab Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-zinc-900/60 rounded-xl w-fit border border-white/4">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                activeTab === tab.key
                                    ? 'bg-white/8 text-white shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/3'
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={cn(
                                    'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                                    activeTab === tab.key
                                        ? 'bg-cyan-500/15 text-cyan-400'
                                        : 'bg-white/5 text-zinc-600'
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Date Range Filter */}
                <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-zinc-600 shrink-0" />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        min={minDate}
                        max={maxDate}
                        className="px-3 py-1.5 bg-zinc-900/80 border border-white/6 rounded-lg text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-cyan-500/30"
                        title="Dari tanggal"
                    />
                    <span className="text-zinc-600 text-xs">—</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        min={minDate}
                        max={maxDate}
                        className="px-3 py-1.5 bg-zinc-900/80 border border-white/6 rounded-lg text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-cyan-500/30"
                        title="Sampai tanggal"
                    />
                    {isFiltered && (
                        <button
                            onClick={clearDateFilter}
                            className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Reset filter"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            {filteredSummary && <SummaryCards stats={filteredSummary} />}

            {/* No results after filter */}
            {isFiltered && filteredData.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-sm text-zinc-500">Tidak ada data untuk rentang tanggal yang dipilih</p>
                    <button onClick={clearDateFilter} className="mt-2 text-sm text-cyan-400 hover:text-cyan-300">
                        Reset filter
                    </button>
                </div>
            )}

            {/* Tab Content */}
            {filteredSummary && activeTab === 'analytics' && (
                <motion.div
                    key="analytics"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <AnalyticsDashboard stats={filteredSummary} />
                </motion.div>
            )}

            {activeTab === 'data' && (
                <motion.div
                    key="data"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ResultsTable data={filteredData} />
                </motion.div>
            )}
        </div>
    );
}
