import { SummaryStats } from '@/lib/excel-processor';
import { Users, AlertTriangle, UserCheck, TrendingDown } from 'lucide-react';

interface SummaryCardsProps {
    stats: SummaryStats;
}

export default function SummaryCards({ stats }: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Cases */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Keterlambatan</h3>
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                </div>
                <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCases}</span>
                    <span className="ml-2 text-sm text-gray-500">kejadian</span>
                </div>
            </div>

            {/* Total Employees */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Karyawan Terlambat</h3>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>
                <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalEmployees}</span>
                    <span className="ml-2 text-sm text-gray-500">orang</span>
                </div>
            </div>

            {/* Avg per Employee */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Rata-rata / Orang</h3>
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                </div>
                <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.avgPerEmployee}</span>
                    <span className="ml-2 text-sm text-gray-500">kali</span>
                </div>
            </div>

            {/* Top Violator */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Paling Sering</h3>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                </div>
                <div className="relative z-10">
                    {stats.top5.length > 0 ? (
                        <>
                            <div className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                {stats.top5[0].name}
                            </div>
                            <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-1">
                                {stats.top5[0].count} kali terlambat
                            </div>
                        </>
                    ) : (
                        <span className="text-lg text-gray-400">-</span>
                    )}
                </div>
            </div>
        </div>
    );
}
