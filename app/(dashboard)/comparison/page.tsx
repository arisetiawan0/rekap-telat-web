'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitCompareArrows,
    CalendarRange,
    Loader2,
    AlertTriangle,
    Users,
    Clock,
    TrendingUp,
    TrendingDown,
    Minus,
    ArrowRight,
    Timer,
    Search,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { cn, formatDuration, formatPercentChange, computePeriodStats, CHART_COLORS } from '@/lib/utils';
import { getRecordsByDateRange } from '@/lib/database';
import type { AttendanceRecord } from '@/lib/types';

// ============================================
// Types
// ============================================

interface PeriodData {
    label: string;
    dateFrom: string;
    dateTo: string;
    records: AttendanceRecord[];
    stats: ReturnType<typeof computePeriodStats>;
}

interface EmployeeDelta {
    name: string;
    organization: string;
    countA: number;
    countB: number;
    minutesA: number;
    minutesB: number;
    countChange: number;
    minutesChange: number;
    status: 'improved' | 'worsened' | 'new' | 'resolved' | 'same';
}

// ============================================
// Custom Chart Tooltip
// ============================================
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-zinc-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl">
            <p className="text-xs text-zinc-400 mb-2 font-medium">{label}</p>
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-zinc-300">{entry.name}:</span>
                    <span className="font-bold text-white">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

// ============================================
// Delta Badge
// ============================================
function DeltaBadge({ oldVal, newVal, invertColor = false }: { oldVal: number; newVal: number; invertColor?: boolean }) {
    const delta = formatPercentChange(oldVal, newVal);
    const isGood = invertColor ? !delta.isPositive : delta.isPositive;
    return (
        <span className={cn(
            'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg',
            delta.isNeutral && 'bg-zinc-500/10 text-zinc-400',
            !delta.isNeutral && isGood && 'bg-emerald-500/10 text-emerald-400',
            !delta.isNeutral && !isGood && 'bg-red-500/10 text-red-400',
        )}>
            {delta.isNeutral ? <Minus className="w-3 h-3" /> : isGood ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {delta.text}
        </span>
    );
}

// ============================================
// Stat Comparison Card
// ============================================
function StatCard({ label, icon: Icon, valueA, valueB, unitA, unitB, iconColor, iconBg }: {
    label: string;
    icon: any;
    valueA: string | number;
    valueB: string | number;
    unitA?: string;
    unitB?: string;
    iconColor: string;
    iconBg: string;
}) {
    const numA = typeof valueA === 'number' ? valueA : parseFloat(valueA) || 0;
    const numB = typeof valueB === 'number' ? valueB : parseFloat(valueB) || 0;
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5"
        >
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
                <div className={`p-2 ${iconBg} rounded-lg`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-[10px] text-cyan-400/60 font-medium mb-1">PERIODE A</p>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-white">{valueA}</span>
                        {unitA && <span className="text-[10px] text-zinc-500">{unitA}</span>}
                    </div>
                </div>
                <div>
                    <p className="text-[10px] text-purple-400/60 font-medium mb-1">PERIODE B</p>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-white">{valueB}</span>
                        {unitB && <span className="text-[10px] text-zinc-500">{unitB}</span>}
                    </div>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-zinc-600">Perubahan</span>
                <DeltaBadge oldVal={numA} newVal={numB} />
            </div>
        </motion.div>
    );
}

// ============================================
// Main Page Component
// ============================================
export default function ComparisonPage() {
    // Period A date inputs
    const [aFrom, setAFrom] = useState('');
    const [aTo, setATo] = useState('');
    // Period B date inputs
    const [bFrom, setBFrom] = useState('');
    const [bTo, setBTo] = useState('');

    const [periodA, setPeriodA] = useState<PeriodData | null>(null);
    const [periodB, setPeriodB] = useState<PeriodData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [empSearch, setEmpSearch] = useState('');

    const canCompare = aFrom && aTo && bFrom && bTo;

    // ============================================
    // Fetch & Compare
    // ============================================
    const handleCompare = async () => {
        if (!canCompare) return;
        setIsLoading(true);
        setError(null);
        try {
            const [recordsA, recordsB] = await Promise.all([
                getRecordsByDateRange(aFrom, aTo),
                getRecordsByDateRange(bFrom, bTo),
            ]);

            if (recordsA.length === 0 && recordsB.length === 0) {
                setError('Tidak ada data ditemukan untuk kedua periode. Pastikan tanggal yang dipilih sesuai dengan data yang sudah diupload.');
                setPeriodA(null);
                setPeriodB(null);
                setIsLoading(false);
                return;
            }

            setPeriodA({
                label: 'Periode A',
                dateFrom: aFrom,
                dateTo: aTo,
                records: recordsA,
                stats: computePeriodStats(recordsA),
            });
            setPeriodB({
                label: 'Periode B',
                dateFrom: bFrom,
                dateTo: bTo,
                records: recordsB,
                stats: computePeriodStats(recordsB),
            });
        } catch (err) {
            setError('Gagal mengambil data. Periksa koneksi dan coba lagi.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // Computed: Employee Deltas
    // ============================================
    const employeeDeltas: EmployeeDelta[] = useMemo(() => {
        if (!periodA || !periodB) return [];
        const empMapA = new Map<string, { count: number; minutes: number; org: string }>();
        const empMapB = new Map<string, { count: number; minutes: number; org: string }>();

        for (const r of periodA.records) {
            const prev = empMapA.get(r.fullName) || { count: 0, minutes: 0, org: r.organization || '' };
            empMapA.set(r.fullName, { count: prev.count + 1, minutes: prev.minutes + r.lateMinutes, org: prev.org || r.organization || '' });
        }
        for (const r of periodB.records) {
            const prev = empMapB.get(r.fullName) || { count: 0, minutes: 0, org: r.organization || '' };
            empMapB.set(r.fullName, { count: prev.count + 1, minutes: prev.minutes + r.lateMinutes, org: prev.org || r.organization || '' });
        }

        const allNames = new Set([...empMapA.keys(), ...empMapB.keys()]);
        const deltas: EmployeeDelta[] = [];

        for (const name of allNames) {
            const a = empMapA.get(name);
            const b = empMapB.get(name);
            const countA = a?.count || 0;
            const countB = b?.count || 0;
            const minutesA = a?.minutes || 0;
            const minutesB = b?.minutes || 0;

            let status: EmployeeDelta['status'] = 'same';
            if (!a && b) status = 'new';
            else if (a && !b) status = 'resolved';
            else if (countB < countA) status = 'improved';
            else if (countB > countA) status = 'worsened';

            deltas.push({
                name,
                organization: a?.org || b?.org || '',
                countA,
                countB,
                minutesA,
                minutesB,
                countChange: countB - countA,
                minutesChange: minutesB - minutesA,
                status,
            });
        }

        return deltas.sort((a, b) => {
            const order = { worsened: 0, new: 1, same: 2, improved: 3, resolved: 4 };
            return order[a.status] - order[b.status] || b.countChange - a.countChange;
        });
    }, [periodA, periodB]);

    const filteredDeltas = useMemo(() => {
        if (!empSearch) return employeeDeltas;
        const q = empSearch.toLowerCase();
        return employeeDeltas.filter(e => e.name.toLowerCase().includes(q) || e.organization.toLowerCase().includes(q));
    }, [employeeDeltas, empSearch]);

    // ============================================
    // Computed: Severity Comparison Chart Data
    // ============================================
    const severityChartData = useMemo(() => {
        if (!periodA || !periodB) return [];
        const labels = ['Ringan', 'Sedang', 'Berat'];
        return labels.map(label => {
            const a = periodA.stats.severityBreakdown.find(s => s.name === label)?.value || 0;
            const b = periodB.stats.severityBreakdown.find(s => s.name === label)?.value || 0;
            return { name: label, 'Periode A': a, 'Periode B': b };
        });
    }, [periodA, periodB]);

    // ============================================
    // Computed: Trend Overlay Data
    // ============================================
    const trendOverlayData = useMemo(() => {
        if (!periodA || !periodB) return [];
        const allDates = new Set<string>();
        periodA.stats.trends.forEach(t => allDates.add(t.date));
        periodB.stats.trends.forEach(t => allDates.add(t.date));
        const trendMapA = new Map(periodA.stats.trends.map(t => [t.date, t.count]));
        const trendMapB = new Map(periodB.stats.trends.map(t => [t.date, t.count]));
        return Array.from(allDates).sort().map(date => ({
            date: date.slice(5), // MM-DD for shorter labels
            'Periode A': trendMapA.get(date) || 0,
            'Periode B': trendMapB.get(date) || 0,
        }));
    }, [periodA, periodB]);

    const hasResults = periodA && periodB;

    // ============================================
    // Status badge helpers
    // ============================================
    const statusConfig = {
        improved: { label: 'Membaik', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: TrendingDown },
        worsened: { label: 'Memburuk', color: 'text-red-400', bg: 'bg-red-500/10', icon: TrendingUp },
        new: { label: 'Baru', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: AlertTriangle },
        resolved: { label: 'Terselesaikan', color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: TrendingDown },
        same: { label: 'Tetap', color: 'text-zinc-400', bg: 'bg-zinc-500/10', icon: Minus },
    };

    // Summary of employee changes
    const empSummary = useMemo(() => {
        const improved = employeeDeltas.filter(e => e.status === 'improved').length;
        const worsened = employeeDeltas.filter(e => e.status === 'worsened').length;
        const newEmps = employeeDeltas.filter(e => e.status === 'new').length;
        const resolved = employeeDeltas.filter(e => e.status === 'resolved').length;
        return { improved, worsened, newEmps, resolved };
    }, [employeeDeltas]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                    <GitCompareArrows className="w-6 h-6 text-cyan-400" />
                    Perbandingan Periode
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Bandingkan dua rentang waktu untuk melihat tren perubahan keterlambatan
                </p>
            </div>

            {/* Period Selector */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Period A */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-cyan-400" />
                            <h3 className="text-sm font-bold text-white">Periode A</h3>
                            <span className="text-[10px] text-zinc-600">(Baseline)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarRange className="w-4 h-4 text-zinc-600 shrink-0" />
                            <input
                                type="date"
                                value={aFrom}
                                onChange={e => setAFrom(e.target.value)}
                                className="flex-1 px-3 py-2 bg-zinc-900/80 border border-white/6 rounded-lg text-sm text-zinc-300 outline-none focus:ring-1 focus:ring-cyan-500/30"
                                placeholder="Dari"
                            />
                            <span className="text-zinc-600 text-xs">—</span>
                            <input
                                type="date"
                                value={aTo}
                                onChange={e => setATo(e.target.value)}
                                className="flex-1 px-3 py-2 bg-zinc-900/80 border border-white/6 rounded-lg text-sm text-zinc-300 outline-none focus:ring-1 focus:ring-cyan-500/30"
                                placeholder="Sampai"
                            />
                        </div>
                    </div>

                    {/* Period B */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-400" />
                            <h3 className="text-sm font-bold text-white">Periode B</h3>
                            <span className="text-[10px] text-zinc-600">(Perbandingan)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarRange className="w-4 h-4 text-zinc-600 shrink-0" />
                            <input
                                type="date"
                                value={bFrom}
                                onChange={e => setBFrom(e.target.value)}
                                className="flex-1 px-3 py-2 bg-zinc-900/80 border border-white/6 rounded-lg text-sm text-zinc-300 outline-none focus:ring-1 focus:ring-purple-500/30"
                                placeholder="Dari"
                            />
                            <span className="text-zinc-600 text-xs">—</span>
                            <input
                                type="date"
                                value={bTo}
                                onChange={e => setBTo(e.target.value)}
                                className="flex-1 px-3 py-2 bg-zinc-900/80 border border-white/6 rounded-lg text-sm text-zinc-300 outline-none focus:ring-1 focus:ring-purple-500/30"
                                placeholder="Sampai"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                    <button
                        onClick={handleCompare}
                        disabled={!canCompare || isLoading}
                        className={cn(
                            'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all',
                            canCompare && !isLoading
                                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/20'
                                : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed border border-white/4'
                        )}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            <>
                                <GitCompareArrows className="w-4 h-4" />
                                Bandingkan
                            </>
                        )}
                    </button>
                    {!canCompare && (
                        <p className="text-xs text-zinc-600">Pilih rentang tanggal untuk kedua periode</p>
                    )}
                </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
                {hasResults && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-8"
                    >
                        {/* Period Labels */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/8 border border-cyan-500/15 rounded-lg">
                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                                <span className="text-cyan-300 font-medium">Periode A:</span>
                                <span className="text-zinc-400">{aFrom} → {aTo}</span>
                                <span className="text-cyan-500 font-bold">({periodA.records.length} record)</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-600" />
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/8 border border-purple-500/15 rounded-lg">
                                <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                                <span className="text-purple-300 font-medium">Periode B:</span>
                                <span className="text-zinc-400">{bFrom} → {bTo}</span>
                                <span className="text-purple-500 font-bold">({periodB.records.length} record)</span>
                            </div>
                        </div>

                        {/* Summary Comparison Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                label="Total Keterlambatan"
                                icon={AlertTriangle}
                                valueA={periodA.stats.totalCases}
                                valueB={periodB.stats.totalCases}
                                unitA="kejadian"
                                unitB="kejadian"
                                iconColor="text-red-400"
                                iconBg="bg-red-500/10"
                            />
                            <StatCard
                                label="Karyawan Terlambat"
                                icon={Users}
                                valueA={periodA.stats.totalEmployees}
                                valueB={periodB.stats.totalEmployees}
                                unitA="orang"
                                unitB="orang"
                                iconColor="text-blue-400"
                                iconBg="bg-blue-500/10"
                            />
                            <StatCard
                                label="Rata-rata Telat"
                                icon={Timer}
                                valueA={periodA.stats.avgLateMinutes}
                                valueB={periodB.stats.avgLateMinutes}
                                unitA="menit"
                                unitB="menit"
                                iconColor="text-cyan-400"
                                iconBg="bg-cyan-500/10"
                            />
                            <StatCard
                                label="Total Menit Telat"
                                icon={Clock}
                                valueA={formatDuration(periodA.stats.totalLateMinutes)}
                                valueB={formatDuration(periodB.stats.totalLateMinutes)}
                                iconColor="text-purple-400"
                                iconBg="bg-purple-500/10"
                            />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Severity Comparison */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="glass-card p-5"
                            >
                                <h3 className="text-sm font-bold text-white mb-4">Perbandingan Severity</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={severityChartData} barGap={4}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fill: '#71717a', fontSize: 12 }}
                                                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                            />
                                            <YAxis
                                                tick={{ fill: '#71717a', fontSize: 12 }}
                                                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                            />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend
                                                wrapperStyle={{ fontSize: '12px' }}
                                                iconType="circle"
                                            />
                                            <Bar dataKey="Periode A" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            <Bar dataKey="Periode B" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* Trend Overlay */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="glass-card p-5"
                            >
                                <h3 className="text-sm font-bold text-white mb-4">Tren Harian Overlay</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trendOverlayData}>
                                            <defs>
                                                <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fill: '#71717a', fontSize: 10 }}
                                                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                            />
                                            <YAxis
                                                tick={{ fill: '#71717a', fontSize: 12 }}
                                                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                            />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend
                                                wrapperStyle={{ fontSize: '12px' }}
                                                iconType="circle"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="Periode A"
                                                stroke="#22d3ee"
                                                fill="url(#gradA)"
                                                strokeWidth={2}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="Periode B"
                                                stroke="#a78bfa"
                                                fill="url(#gradB)"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        </div>

                        {/* Employee Delta Table */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card p-5"
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                                <div>
                                    <h3 className="text-sm font-bold text-white">Perubahan per Karyawan</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {empSummary.improved > 0 && <span className="text-emerald-400">{empSummary.improved} membaik</span>}
                                        {empSummary.improved > 0 && empSummary.worsened > 0 && ' · '}
                                        {empSummary.worsened > 0 && <span className="text-red-400">{empSummary.worsened} memburuk</span>}
                                        {(empSummary.improved > 0 || empSummary.worsened > 0) && empSummary.newEmps > 0 && ' · '}
                                        {empSummary.newEmps > 0 && <span className="text-amber-400">{empSummary.newEmps} baru</span>}
                                        {(empSummary.improved > 0 || empSummary.worsened > 0 || empSummary.newEmps > 0) && empSummary.resolved > 0 && ' · '}
                                        {empSummary.resolved > 0 && <span className="text-cyan-400">{empSummary.resolved} terselesaikan</span>}
                                    </p>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="text"
                                        placeholder="Cari karyawan..."
                                        value={empSearch}
                                        onChange={e => setEmpSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-zinc-900/80 border border-white/6 rounded-lg text-sm text-zinc-300 outline-none focus:ring-1 focus:ring-cyan-500/30"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/6">
                                            <th className="text-left py-3 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Karyawan</th>
                                            <th className="text-center py-3 px-3 text-xs font-semibold text-cyan-400/60 uppercase tracking-wider">Periode A</th>
                                            <th className="text-center py-3 px-3 text-xs font-semibold text-purple-400/60 uppercase tracking-wider">Periode B</th>
                                            <th className="text-center py-3 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Δ Kejadian</th>
                                            <th className="text-center py-3 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Δ Menit</th>
                                            <th className="text-center py-3 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDeltas.slice(0, 50).map((emp, i) => {
                                            const cfg = statusConfig[emp.status];
                                            const StatusIcon = cfg.icon;
                                            return (
                                                <tr
                                                    key={emp.name}
                                                    className="border-b border-white/3 hover:bg-white/2 transition-colors"
                                                >
                                                    <td className="py-3 px-3">
                                                        <p className="text-white font-medium">{emp.name}</p>
                                                        {emp.organization && <p className="text-[10px] text-zinc-600 mt-0.5">{emp.organization}</p>}
                                                    </td>
                                                    <td className="text-center py-3 px-3">
                                                        <span className="text-zinc-300">{emp.countA}x</span>
                                                        <span className="text-zinc-600 text-xs ml-1">({emp.minutesA}m)</span>
                                                    </td>
                                                    <td className="text-center py-3 px-3">
                                                        <span className="text-zinc-300">{emp.countB}x</span>
                                                        <span className="text-zinc-600 text-xs ml-1">({emp.minutesB}m)</span>
                                                    </td>
                                                    <td className="text-center py-3 px-3">
                                                        <span className={cn(
                                                            'font-bold',
                                                            emp.countChange > 0 && 'text-red-400',
                                                            emp.countChange < 0 && 'text-emerald-400',
                                                            emp.countChange === 0 && 'text-zinc-500',
                                                        )}>
                                                            {emp.countChange > 0 ? '+' : ''}{emp.countChange}
                                                        </span>
                                                    </td>
                                                    <td className="text-center py-3 px-3">
                                                        <span className={cn(
                                                            'font-bold',
                                                            emp.minutesChange > 0 && 'text-red-400',
                                                            emp.minutesChange < 0 && 'text-emerald-400',
                                                            emp.minutesChange === 0 && 'text-zinc-500',
                                                        )}>
                                                            {emp.minutesChange > 0 ? '+' : ''}{emp.minutesChange}m
                                                        </span>
                                                    </td>
                                                    <td className="text-center py-3 px-3">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            {cfg.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {filteredDeltas.length > 50 && (
                                    <p className="text-center text-xs text-zinc-600 py-3">
                                        Menampilkan 50 dari {filteredDeltas.length} karyawan. Gunakan pencarian untuk filter.
                                    </p>
                                )}
                                {filteredDeltas.length === 0 && (
                                    <p className="text-center text-sm text-zinc-600 py-8">
                                        {empSearch ? 'Tidak ada karyawan yang cocok dengan pencarian.' : 'Tidak ada data karyawan.'}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
