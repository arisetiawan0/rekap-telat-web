'use client';

import type { AttendanceRecord, SortConfig, FilterState } from '@/lib/types';
import { cn, exportToExcel, exportToCSV, getSeverityLevel, getSeverityColor, getSeverityBg } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, Clock, AlertCircle, FileSpreadsheet, Download, Filter, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface ResultsTableProps {
    data: AttendanceRecord[];
}

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

export default function ResultsTable({ data }: ResultsTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        organization: '',
        shift: '',
        severity: '',
        dateFrom: '',
        dateTo: '',
    });

    // Extract unique values for filter dropdowns
    const organizations = useMemo(() => {
        const orgs = new Set(data.map(d => d.organization).filter(Boolean));
        return Array.from(orgs).sort() as string[];
    }, [data]);

    const shifts = useMemo(() => {
        const s = new Set(data.map(d => d.shift).filter(Boolean));
        return Array.from(s).sort();
    }, [data]);

    const activeFilterCount = [
        filters.search, filters.organization, filters.shift,
        filters.severity, filters.dateFrom, filters.dateTo
    ].filter(Boolean).length;

    // Sorting
    const handleSort = (key: keyof AttendanceRecord) => {
        setSortConfig((current) => {
            if (!current || current.key !== key) return { key, direction: 'asc' };
            if (current.direction === 'asc') return { key, direction: 'desc' };
            return null;
        });
    };

    // Filtered & sorted data
    const processedData = useMemo(() => {
        let result = [...data];

        // Text search
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(item =>
                item.fullName.toLowerCase().includes(q) || item.date.includes(q)
            );
        }

        // Organization filter
        if (filters.organization) {
            result = result.filter(item => item.organization === filters.organization);
        }

        // Shift filter
        if (filters.shift) {
            result = result.filter(item => item.shift === filters.shift);
        }

        // Severity filter
        if (filters.severity) {
            result = result.filter(item => getSeverityLevel(item.lateMinutes) === filters.severity);
        }

        // Sort
        if (sortConfig) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal === undefined && bVal === undefined) return 0;
                if (aVal === undefined) return 1;
                if (bVal === undefined) return -1;
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [data, filters, sortConfig]);

    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedData = processedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const clearFilters = () => {
        setFilters({ search: '', organization: '', shift: '', severity: '', dateFrom: '', dateTo: '' });
        setCurrentPage(1);
    };

    // Column sort icon
    const SortIcon = ({ colKey }: { colKey: keyof AttendanceRecord }) => {
        if (sortConfig?.key !== colKey) return <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
            : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />;
    };

    const renderHeader = (label: string, key: keyof AttendanceRecord) => (
        <th
            className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-white/2 transition-colors group select-none whitespace-nowrap"
            onClick={() => handleSort(key)}
        >
            <div className="flex items-center gap-1.5">
                <span>{label}</span>
                <SortIcon colKey={key} />
            </div>
        </th>
    );

    const getLateColor = (minutes: number) => {
        if (minutes > 60) return 'text-red-400 bg-red-400/10 border-red-400/20';
        if (minutes > 15) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Cari nama atau tanggal..."
                        value={filters.search}
                        onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setCurrentPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-white/6 rounded-xl text-sm text-zinc-300 placeholder:text-zinc-700 focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/20 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                            showFilters || activeFilterCount > 0
                                ? 'bg-cyan-500/8 text-cyan-400 border-cyan-500/20'
                                : 'bg-white/2 text-zinc-400 border-white/6 hover:bg-white/4'
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <div className="relative group/export">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold border border-emerald-500/20 transition-all">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-white/6 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all z-20">
                            <button onClick={() => exportToExcel(processedData)} className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-white/4 flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                Excel (.xlsx)
                            </button>
                            <button onClick={() => exportToCSV(processedData)} className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-white/4 flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                                CSV (.csv)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="glass-card p-4 flex flex-wrap gap-3 items-center"
                >
                    {organizations.length > 0 && (
                        <select
                            value={filters.organization}
                            onChange={e => { setFilters(f => ({ ...f, organization: e.target.value })); setCurrentPage(1); }}
                            className="px-3 py-2 bg-zinc-900/80 border border-white/6 rounded-xl text-sm text-zinc-400 outline-none min-w-[160px]"
                        >
                            <option value="">Semua Organisasi</option>
                            {organizations.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    )}
                    <select
                        value={filters.shift}
                        onChange={e => { setFilters(f => ({ ...f, shift: e.target.value })); setCurrentPage(1); }}
                        className="px-3 py-2 bg-zinc-900/80 border border-white/6 rounded-xl text-sm text-zinc-400 outline-none min-w-[120px]"
                    >
                        <option value="">Semua Shift</option>
                        {shifts.map(s => <option key={s} value={s}>Shift {s}</option>)}
                    </select>
                    <select
                        value={filters.severity}
                        onChange={e => { setFilters(f => ({ ...f, severity: e.target.value })); setCurrentPage(1); }}
                        className="px-3 py-2 bg-zinc-900/80 border border-white/6 rounded-xl text-sm text-zinc-400 outline-none min-w-[130px]"
                    >
                        <option value="">Semua Tingkat</option>
                        <option value="ringan">Ringan (≤15m)</option>
                        <option value="sedang">Sedang (16-60m)</option>
                        <option value="berat">Berat (&gt;60m)</option>
                    </select>
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            <X className="w-3 h-3" />
                            Clear All
                        </button>
                    )}
                    <div className="ml-auto text-xs text-zinc-500">
                        {processedData.length} record
                    </div>
                </motion.div>
            )}

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-900/50 border-b border-white/4">
                            <tr>
                                {renderHeader('Nama', 'fullName')}
                                {renderHeader('Tanggal', 'date')}
                                {renderHeader('Shift', 'shift')}
                                {renderHeader('Jadwal', 'scheduleIn')}
                                {renderHeader('Check In', 'checkIn')}
                                {renderHeader('Telat', 'lateMinutes')}
                                {renderHeader('Total', 'totalLateCount')}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/3">
                            {paginatedData.length > 0 ? (
                                paginatedData.map((row) => (
                                    <tr key={row.id} className="hover:bg-white/1.5 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{row.fullName}</span>
                                                {row.organization && (
                                                    <span className="text-[10px] text-zinc-600 mt-0.5">{row.organization}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-500 font-mono">{row.date}</td>
                                        <td className="px-4 py-3">
                                            {row.shift ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-medium border bg-zinc-800/50 text-zinc-400 border-zinc-700/50 uppercase">
                                                    {row.shift}
                                                </span>
                                            ) : <span className="text-zinc-600 text-xs">-</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-zinc-400">
                                            <div className="flex items-center gap-1.5">
                                                {row.scheduleIn}
                                                {row.isShiftAdjusted && (
                                                    <div className="group/tip relative">
                                                        <span className="flex items-center justify-center w-4 h-4 bg-cyan-900/30 text-cyan-400 rounded-full cursor-help border border-cyan-500/20">
                                                            <Clock className="w-2.5 h-2.5" />
                                                        </span>
                                                        <div className="absolute left-0 bottom-full mb-1.5 w-max max-w-[180px] p-2 bg-zinc-900 border border-white/8 text-zinc-300 text-[11px] rounded-lg opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                                            <p className="font-semibold text-cyan-400 mb-0.5">Smart Shift</p>
                                                            Asli: <span className="text-white font-mono">{row.originalSchedule || 'OFF'}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-zinc-300">{row.checkIn}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border', getLateColor(row.lateMinutes))}>
                                                <AlertCircle className="w-3 h-3" />
                                                {row.lateMinutes}m
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-500 font-mono text-center">{row.totalLateCount}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-zinc-600">
                                            <Search className="w-10 h-10 opacity-20" />
                                            <p className="text-sm font-medium">Tidak ada data ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-white/4 bg-zinc-900/30">
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span>Tampilkan</span>
                            <select
                                value={itemsPerPage}
                                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="bg-zinc-800 border border-white/6 rounded-lg px-2 py-1 text-zinc-300 outline-none"
                            >
                                {ITEMS_PER_PAGE_OPTIONS.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                            <span>per halaman</span>
                            <span className="text-zinc-600">•</span>
                            <span>Hal. <span className="text-zinc-300 font-medium">{currentPage}</span> dari <span className="text-zinc-300 font-medium">{totalPages}</span></span>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg hover:bg-white/4 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-zinc-400"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg hover:bg-white/4 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-zinc-400"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
