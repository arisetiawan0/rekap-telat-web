'use client';

import { AttendanceRecord } from '@/lib/excel-processor';
import { ChevronLeft, ChevronRight, Search, Download, ArrowUpDown, ArrowUp, ArrowDown, Clock, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';

interface ResultsTableProps {
    data: AttendanceRecord[];
}

type SortKey = keyof AttendanceRecord;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const ITEMS_PER_PAGE = 50;

export default function ResultsTable({ data }: ResultsTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    const handleSort = (key: SortKey) => {
        setSortConfig((current) => {
            if (!current || current.key !== key) {
                return { key, direction: 'asc' };
            }
            if (current.direction === 'asc') {
                return { key, direction: 'desc' };
            }
            return null;
        });
    };

    const sortedData = useMemo(() => {
        let processData = [...data];

        // Filter
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            processData = processData.filter(item =>
                item.fullName.toLowerCase().includes(lowerQ)
            );
        }

        // Sort
        if (sortConfig) {
            processData.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                // Handle undefined values safely
                if (aValue === undefined && bValue === undefined) return 0;
                if (aValue === undefined) return 1;
                if (bValue === undefined) return -1;

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return processData;
    }, [data, searchQuery, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    const paginatedData = sortedData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleDownload = () => {
        const ws = XLSX.utils.json_to_sheet(sortedData.map(item => ({
            "Nama Lengkap": item.fullName,
            "Tanggal": item.date,
            "Shift": item.shift, // Added Shift to export
            "Jadwal Masuk": item.scheduleIn,
            "Jadwal Pulang": item.scheduleOut,
            "Check In": item.checkIn,
            "Check Out": item.checkOut,
            "Telat (Menit)": item.lateMinutes,
            "Status Shift": item.isShiftAdjusted ? `Disesuaikan (${item.originalSchedule || 'OFF'})` : 'Sesuai',
            "Total Keterlambatan": item.totalLateCount
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap Telat");
        XLSX.writeFile(wb, "rekap_telat_export.xlsx");
    };

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        if (sortConfig?.key !== colKey) return <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-4 h-4 text-cyan-400" />
            : <ArrowDown className="w-4 h-4 text-cyan-400" />;
    };

    const renderHeader = (label: string, key: SortKey) => (
        <th
            className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group select-none border-b border-white/5"
            onClick={() => handleSort(key)}
        >
            <div className="flex items-center gap-2">
                <span>{label}</span>
                <SortIcon colKey={key} />
            </div>
        </th>
    );

    // Helpers for Badges
    const getLateColor = (minutes: number) => {
        if (minutes > 60) return "text-red-400 bg-red-400/10 border-red-400/20";
        if (minutes > 15) return "text-amber-400 bg-amber-400/10 border-amber-400/20";
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"; // Just in case
    };

    const getShiftBadge = (shift: string) => {
        if (!shift) return null;
        const isOff = shift.toLowerCase().includes('off');
        const isNight = shift.toLowerCase().includes('n');

        let style = "bg-zinc-800 text-zinc-400 border-zinc-700";
        if (isOff) style = "bg-rose-900/20 text-rose-400 border-rose-800/30";
        else if (isNight) style = "bg-indigo-900/20 text-indigo-400 border-indigo-800/30";
        else style = "bg-blue-900/20 text-blue-400 border-blue-800/30";

        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${style} uppercase tracking-tight`}>
                {shift}
            </span>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-900/50 p-1 rounded-2xl backdrop-blur-sm border border-white/5">
                <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Cari karyawan..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-sm text-gray-300 placeholder:text-gray-600 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30 focus:outline-none transition-all"
                    />
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/20 border border-emerald-500/20 transition-all w-full sm:w-auto justify-center backdrop-blur-md"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export Excel
                </motion.button>
            </div>

            {/* Table */}
            <div className="bg-zinc-950/50 rounded-2xl border border-white/5 overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-900/80 backdrop-blur">
                            <tr>
                                {renderHeader("Nama Lengkap", "fullName")}
                                {renderHeader("Tanggal", "date")}
                                {renderHeader("Shift", "shift")}
                                {renderHeader("Jadwal Masuk", "scheduleIn")}
                                {renderHeader("Jadwal Pulang", "scheduleOut")}
                                {renderHeader("Check In", "checkIn")}
                                {renderHeader("Check Out", "checkOut")}
                                {renderHeader("Telat (Menit)", "lateMinutes")}
                                {renderHeader("Total Akumulasi", "totalLateCount")}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {paginatedData.length > 0 ? (
                                paginatedData.map((row, idx) => (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-200 group-hover:text-white transition-colors">
                                                    {row.fullName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {row.date}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getShiftBadge(row.shift)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-400">
                                            <div className="flex items-center gap-2">
                                                {row.scheduleIn}
                                                {row.isShiftAdjusted && (
                                                    <div className="group/tooltip relative">
                                                        <motion.span
                                                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                            className="flex items-center justify-center w-5 h-5 bg-cyan-900/30 text-cyan-400 rounded-full text-xs cursor-help border border-cyan-500/20"
                                                        >
                                                            <Clock className="w-3 h-3" />
                                                        </motion.span>
                                                        <div className="absolute left-0 bottom-full mb-2 w-max max-w-[200px] p-2 bg-black/90 border border-white/10 text-gray-300 text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 backdrop-blur-xl shadow-xl">
                                                            <p className="font-semibold text-cyan-400 mb-0.5">Smart Shift Detected</p>
                                                            Jadwal asli: <span className="text-white font-mono">{row.originalSchedule || "OFF"}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-500">
                                            {row.scheduleOut}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-300">
                                            {row.checkIn}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-500">
                                            {row.checkOut || "-"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${getLateColor(row.lateMinutes)}`}>
                                                <AlertCircle className="w-3 h-3" />
                                                {row.lateMinutes}m
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                            {row.totalLateCount}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 text-gray-600">
                                            <Search className="w-12 h-12 opacity-20" />
                                            <p className="text-lg font-medium">Tidak ada data ditemukan</p>
                                            <p className="text-sm">Coba kata kunci lain atau upload file baru.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-zinc-900/30">
                        <div className="text-sm text-gray-500">
                            Hal. <span className="font-medium text-gray-300">{currentPage}</span> dari <span className="font-medium text-gray-300">{totalPages}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-400 hover:text-white"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-400 hover:text-white"
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
