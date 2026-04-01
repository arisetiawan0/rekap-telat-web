'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    type LucideIcon,
    GitCompareArrows,
    FileSpreadsheet,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
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
    ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';
import { cn, formatDuration, formatPercentChange, computePeriodStats } from '@/lib/utils';
import { getSessionById } from '@/lib/database';
import { useData } from '@/lib/context';
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

interface ChartTooltipEntry {
    color?: string;
    name?: string;
    value?: string | number;
}

interface ChartTooltipProps {
    active?: boolean;
    label?: string;
    payload?: ChartTooltipEntry[];
}

// ============================================
// Custom Chart Tooltip
// ============================================
function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-zinc-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl">
            <p className="text-xs text-zinc-400 mb-2 font-medium">{label}</p>
            {payload.map((entry, i) => (
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
    icon: LucideIcon;
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
// Custom Select Component
// ============================================
function CustomSelect({
    value,
    onChange,
    options,
    placeholder,
    iconColorClass,
    disabledIds = []
}: {
    value: string;
    onChange: (val: string) => void;
    options: { id: string; label: string }[];
    placeholder: string;
    iconColorClass: string;
    disabledIds?: string[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.id === value);

    return (
        <div className="relative group">
            {/* Click Catcher to close when clicking outside */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full pl-10 pr-10 py-3 bg-zinc-900/80 hover:bg-zinc-800/80 border border-white/6 hover:border-white/10 rounded-xl text-sm outline-none transition-all cursor-pointer flex items-center justify-between z-10 relative ${isOpen ? 'ring-1 ring-cyan-500/30' : ''}`}
            >
                <div className={`absolute left-3 text-zinc-500 transition-colors pointer-events-none ${isOpen ? iconColorClass : 'group-hover:' + iconColorClass}`}>
                    <FileSpreadsheet className="w-4 h-4" />
                </div>

                <span className={`block truncate ${!selectedOption ? 'text-zinc-500' : 'text-zinc-300'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                <div className="absolute right-3 text-zinc-600 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 py-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto"
                    >
                        {options.map(opt => {
                            const isDisabled = disabledIds.includes(opt.id);
                            return (
                                <div
                                    key={opt.id}
                                    onClick={() => {
                                        if (isDisabled) return;
                                        onChange(opt.id);
                                        setIsOpen(false);
                                    }}
                                    className={`px-4 py-2.5 text-sm transition-colors ${isDisabled
                                        ? 'text-zinc-600 bg-zinc-900/50 cursor-not-allowed'
                                        : value === opt.id
                                            ? 'bg-white/10 text-white cursor-default font-medium'
                                            : 'text-zinc-300 hover:bg-white/5 cursor-pointer'
                                        }`}
                                >
                                    {opt.label}
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// Main Page Component
// ============================================
export default function ComparisonPage() {
    // Session IDs
    const [sessionAId, setSessionAId] = useState('');
    const [sessionBId, setSessionBId] = useState('');

    const { sessions } = useData();

    // Compute available periods from sessions history
    const availablePeriods = useMemo(() => {
        return sessions.map(session => {
            try {
                const summary = JSON.parse(session.summary_json);
                if (!summary.trends || summary.trends.length === 0) return null;

                // Helper function to extract time values for sorting
                const dateToTime = (dStr: string) => {
                    if (dStr.includes('/')) {
                        const [d, m, y] = dStr.split('/').map(Number);
                        return new Date(y, m - 1, d).getTime();
                    } else if (dStr.includes('-')) {
                        const [y, m, d] = dStr.split('-').map(Number);
                        return new Date(y, m - 1, d).getTime();
                    }
                    return new Date(dStr).getTime();
                };

                // Sort trends to ensure we get absolute min and max dates
                const sortedTrends = [...summary.trends].sort((a, b) =>
                    dateToTime(a.date) - dateToTime(b.date)
                );

                const firstDateStr = sortedTrends[0].date;
                const lastDateStr = sortedTrends[sortedTrends.length - 1].date;

                const parseDate = (dStr: string) => {
                    // Try parsing DD/MM/YYYY
                    if (dStr.includes('/')) {
                        const partsSlash = dStr.split('/');
                        if (partsSlash.length === 3) {
                            const [d, m, y] = partsSlash;
                            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        }
                    }
                    // Try parsing YYYY-MM-DD
                    if (dStr.includes('-')) {
                        const partsDash = dStr.split('-');
                        if (partsDash.length === 3) {
                            const [y, m, d] = partsDash;
                            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        }
                    }
                    return dStr; // Fallback to raw string
                };

                return {
                    id: session.id,
                    name: session.file_name,
                    from: parseDate(firstDateStr),
                    to: parseDate(lastDateStr),
                    label: `${session.file_name} (${firstDateStr} — ${lastDateStr})`
                };
            } catch (e) {
                console.error('Failed to parse available period', e);
                return null;
            }
        }).filter(Boolean) as { id: string; name: string; from: string; to: string; label: string }[];
    }, [sessions]);

    const [periodA, setPeriodA] = useState<PeriodData | null>(null);
    const [periodB, setPeriodB] = useState<PeriodData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [empSearch, setEmpSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    const canCompare = sessionAId && sessionBId && sessionAId !== sessionBId;

    // ============================================
    // Fetch & Compare
    // ============================================
    const handleCompare = async () => {
        if (!canCompare) return;
        setIsLoading(true);
        setError(null);
        try {
            const [resultA, resultB] = await Promise.all([
                getSessionById(sessionAId),
                getSessionById(sessionBId),
            ]);

            if (!resultA || !resultB) {
                setError('Data sesi tidak ditemukan. Mungkin file sudah dihapus.');
                setPeriodA(null);
                setPeriodB(null);
                setIsLoading(false);
                return;
            }

            const infoA = availablePeriods.find(p => p.id === sessionAId);
            const infoB = availablePeriods.find(p => p.id === sessionBId);

            setPeriodA({
                label: 'Periode A',
                dateFrom: infoA?.from || 'N/A',
                dateTo: infoA?.to || 'N/A',
                records: resultA.records,
                stats: computePeriodStats(resultA.records),
            });
            setPeriodB({
                label: 'Periode B',
                dateFrom: infoB?.from || 'N/A',
                dateTo: infoB?.to || 'N/A',
                records: resultB.records,
                stats: computePeriodStats(resultB.records),
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

    const totalPages = Math.ceil(filteredDeltas.length / itemsPerPage);
    const paginatedDeltas = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredDeltas.slice(start, start + itemsPerPage);
    }, [filteredDeltas, currentPage, itemsPerPage]);

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

                        <CustomSelect
                            value={sessionAId}
                            onChange={setSessionAId}
                            options={availablePeriods}
                            placeholder="Pilih file / sesi upload..."
                            iconColorClass="text-cyan-400"
                        />
                    </div>

                    {/* Period B */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-400" />
                            <h3 className="text-sm font-bold text-white">Periode B</h3>
                            <span className="text-[10px] text-zinc-600">(Perbandingan)</span>
                        </div>

                        <CustomSelect
                            value={sessionBId}
                            onChange={setSessionBId}
                            options={availablePeriods}
                            placeholder="Pilih file / sesi upload..."
                            iconColorClass="text-purple-400"
                            disabledIds={sessionAId ? [sessionAId] : []}
                        />
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
                        <p className="text-xs text-zinc-600 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {(!sessionAId || !sessionBId) ? 'Pilih dua file yang berbeda untuk dibandingkan' : 'File A dan File B tidak boleh sama'}
                        </p>
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
                                <span className="text-zinc-400">{periodA.dateFrom} → {periodA.dateTo}</span>
                                <span className="text-cyan-500 font-bold">({periodA.records.length} record)</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-600" />
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/8 border border-purple-500/15 rounded-lg">
                                <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                                <span className="text-purple-300 font-medium">Periode B:</span>
                                <span className="text-zinc-400">{periodB.dateFrom} → {periodB.dateTo}</span>
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
                                        onChange={e => {
                                            setEmpSearch(e.target.value);
                                            setCurrentPage(1); // Reset page on query
                                        }}
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
                                        {paginatedDeltas.map((emp) => {
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
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-4 border-t border-white/5">
                                        <div className="flex items-center gap-3 text-sm text-zinc-400">
                                            <span>Tampilkan</span>
                                            <div className="relative">
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => {
                                                        setItemsPerPage(Number(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                    className="appearance-none bg-zinc-900 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 outline-none hover:border-white/20 transition-colors cursor-pointer"
                                                >
                                                    <option value="10">10</option>
                                                    <option value="25">25</option>
                                                    <option value="50">50</option>
                                                    <option value="100">100</option>
                                                </select>
                                                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" />
                                            </div>
                                            <span>per halaman</span>
                                            <span className="text-zinc-600 px-1">•</span>
                                            <span>Hal. <span className="text-zinc-200 font-medium">{currentPage}</span> dari {totalPages}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
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
