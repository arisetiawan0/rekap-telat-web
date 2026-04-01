'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, ChevronDown, ChevronUp, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';
import { getAllEmployeesAggregated } from '@/lib/database';
import type { EmployeeSummary } from '@/lib/types';

const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
    ringan: { label: 'RINGAN', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    sedang: { label: 'SEDANG', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    berat: { label: 'BERAT', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const AVATAR_COLORS = [
    'from-red-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-purple-500 to-violet-500',
    'from-amber-500 to-orange-500',
    'from-teal-500 to-cyan-500',
];

function getInitials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getAvatarColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [orgFilter, setOrgFilter] = useState('');
    const [sortBy, setSortBy] = useState<'count' | 'minutes' | 'name'>('count');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Fetch all employees from DB
    const loadEmployees = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await getAllEmployeesAggregated();
            setEmployees(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal memuat data karyawan.';
            setEmployees([]);
            setLoadError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
    }, []);

    // Get unique organizations
    const organizations = useMemo(() => {
        const orgs = new Set(employees.map(e => e.organization).filter(Boolean));
        return Array.from(orgs).sort();
    }, [employees]);

    // Filter & sort
    const filtered = useMemo(() => {
        let result = employees;

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(e => e.name.toLowerCase().includes(q));
        }

        if (orgFilter) {
            result = result.filter(e => e.organization === orgFilter);
        }

        switch (sortBy) {
            case 'count':
                result = [...result].sort((a, b) => b.totalLateCount - a.totalLateCount);
                break;
            case 'minutes':
                result = [...result].sort((a, b) => b.totalLateMinutes - a.totalLateMinutes);
                break;
            case 'name':
                result = [...result].sort((a, b) => a.name.localeCompare(b.name));
                break;
        }

        return result;
    }, [employees, search, orgFilter, sortBy]);

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
                <p className="text-sm text-zinc-500">Memuat data karyawan dari semua session...</p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-800/50 rounded-2xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-zinc-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Gagal Memuat Data Karyawan</h2>
                    <p className="text-sm text-zinc-500 max-w-xl mx-auto">
                        {loadError}
                    </p>
                    <p className="text-sm text-zinc-600 max-w-xl mx-auto">
                        Pastikan `DATABASE_URL` TiDB valid dan route API bisa terhubung ke database.
                    </p>
                </div>
                <button
                    onClick={loadEmployees}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-white/3 hover:bg-white/6 rounded-xl border border-white/6 transition-all"
                >
                    <RefreshCw className="w-4 h-4" />
                    Coba Lagi
                </button>
            </div>
        );
    }

    // Empty state
    if (employees.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-800/50 rounded-2xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-zinc-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Belum Ada Data Karyawan</h2>
                    <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                        Upload file absensi untuk mulai melihat data keterlambatan karyawan.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Karyawan</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        {filtered.length} karyawan — data agregasi dari semua upload
                    </p>
                </div>
                <button
                    onClick={loadEmployees}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-white/3 hover:bg-white/6 rounded-xl border border-white/6 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                        type="text"
                        placeholder="Cari karyawan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-white/6 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
                    />
                </div>

                {organizations.length > 1 && (
                    <select
                        value={orgFilter}
                        onChange={(e) => setOrgFilter(e.target.value)}
                        className="px-4 py-2.5 bg-zinc-900/80 border border-white/6 rounded-xl text-sm text-zinc-300 outline-none min-w-[140px]"
                    >
                        <option value="">Semua Organisasi</option>
                        {organizations.map(org => (
                            <option key={org} value={org}>{org}</option>
                        ))}
                    </select>
                )}

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'count' | 'minutes' | 'name')}
                    className="px-4 py-2.5 bg-zinc-900/80 border border-white/6 rounded-xl text-sm text-zinc-300 outline-none min-w-[160px]"
                >
                    <option value="count">Terbanyak Telat</option>
                    <option value="minutes">Total Menit Terlama</option>
                    <option value="name">Nama A-Z</option>
                </select>
            </div>

            {/* Employee Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                    {filtered.map((emp, idx) => {
                        const badge = SEVERITY_BADGE[emp.severity];
                        const isExpanded = expandedId === emp.name;
                        const rankBadge = idx < 3 && sortBy === 'count';

                        return (
                            <motion.div
                                key={emp.name}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: Math.min(idx * 0.03, 0.15) }}
                                className="glass-card glass-card-hover cursor-pointer"
                                onClick={() => setExpandedId(isExpanded ? null : emp.name)}
                            >
                                <div className="p-5">
                                    {/* Top row */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className={cn(
                                            'w-10 h-10 rounded-xl bg-linear-to-br flex items-center justify-center text-white text-xs font-bold shrink-0',
                                            getAvatarColor(emp.name)
                                        )}>
                                            {getInitials(emp.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-white truncate">{emp.name}</h3>
                                                {rankBadge && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                                                        #{idx + 1}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-zinc-500 truncate">
                                                {emp.organization}
                                                {emp.jobPosition && <span> · {emp.jobPosition}</span>}
                                            </p>
                                        </div>
                                        <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg border', badge.className)}>
                                            {badge.label}
                                        </span>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center justify-between">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-white">{emp.totalLateCount}</p>
                                            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Kali Telat</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-white">{formatDuration(emp.totalLateMinutes)}</p>
                                            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Total</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-zinc-400">{formatDuration(emp.avgLateMinutes)}</p>
                                            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Rata-rata</p>
                                        </div>
                                    </div>

                                    {/* Expanded: Date List */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-4 pt-4 border-t border-white/4 space-y-2">
                                                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Calendar className="w-3 h-3" />
                                                        Tanggal Keterlambatan ({emp.dates.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {emp.dates.map(d => (
                                                            <span key={d} className="text-[11px] px-2 py-1 bg-white/3 rounded-lg text-zinc-400 border border-white/4">
                                                                {d}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Expand indicator */}
                                    <div className="flex justify-center mt-3 text-zinc-600">
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
