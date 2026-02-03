'use client';

import { AttendanceRecord } from '@/lib/excel-processor';
import { ChevronLeft, ChevronRight, Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

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
            "Jadwal Masuk": item.scheduleIn,
            "Jadwal Pulang": item.scheduleOut,
            "Check In": item.checkIn,
            "Check Out": item.checkOut,
            "Telat (Menit)": item.lateMinutes,
            "Total Keterlambatan": item.totalLateCount
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap Telat");
        XLSX.writeFile(wb, "rekap_telat_export.xlsx");
    };

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        if (sortConfig?.key !== colKey) return <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-4 h-4 text-blue-600" />
            : <ArrowDown className="w-4 h-4 text-blue-600" />;
    };

    const renderHeader = (label: string, key: SortKey) => (
        <th
            className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors group select-none"
            onClick={() => handleSort(key)}
        >
            <div className="flex items-center justify-between gap-2">
                <span>{label}</span>
                <SortIcon colKey={key} />
            </div>
        </th>
    );

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* Header Actions */}
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari nama..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1); // Reset to page 1 on search
                        }}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>

                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Export Excel
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-zinc-800/50">
                        <tr>
                            {renderHeader("Nama Lengkap", "fullName")}
                            {renderHeader("Tanggal", "date")}
                            {renderHeader("Jadwal Masuk", "scheduleIn")}
                            {renderHeader("Jadwal Pulang", "scheduleOut")}
                            {renderHeader("Check In", "checkIn")}
                            {renderHeader("Check Out", "checkOut")}
                            {renderHeader("Telat (Menit)", "lateMinutes")}
                            {renderHeader("Total Akumulasi", "totalLateCount")}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                        {row.fullName}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                        {row.date}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono">
                                        {row.scheduleIn}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono">
                                        {row.scheduleOut}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono">
                                        {row.checkIn}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono">
                                        {row.checkOut || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-red-600 dark:text-red-400 font-semibold">
                                        {row.lateMinutes}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                        {row.totalLateCount}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    Tidak ada data yang ditemukan.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/30">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Halaman <span className="font-medium">{currentPage}</span> dari <span className="font-medium">{totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
