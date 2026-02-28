'use client';

import type { SummaryStats } from '@/lib/types';
import { AlertTriangle, Users, TrendingDown, Clock, Zap, Timer } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SummaryCardsProps {
    stats: SummaryStats;
}

const cards = [
    {
        key: 'totalCases',
        label: 'Total Keterlambatan',
        icon: AlertTriangle,
        iconBg: 'bg-red-500/10',
        iconColor: 'text-red-400',
        border: 'stat-border-red',
        getValue: (s: SummaryStats) => s.totalCases,
        unit: 'kejadian',
    },
    {
        key: 'totalEmployees',
        label: 'Karyawan Terlambat',
        icon: Users,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-400',
        border: 'stat-border-blue',
        getValue: (s: SummaryStats) => s.totalEmployees,
        unit: 'orang',
    },
    {
        key: 'avgPerEmployee',
        label: 'Rata-rata / Orang',
        icon: TrendingDown,
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-400',
        border: 'stat-border-amber',
        getValue: (s: SummaryStats) => s.avgPerEmployee,
        unit: 'kali',
    },
    {
        key: 'avgLateMinutes',
        label: 'Rata-rata Telat',
        icon: Timer,
        iconBg: 'bg-cyan-500/10',
        iconColor: 'text-cyan-400',
        border: 'stat-border-cyan',
        getValue: (s: SummaryStats) => s.avgLateMinutes,
        unit: 'menit',
    },
    {
        key: 'totalLateMinutes',
        label: 'Total Menit Telat',
        icon: Clock,
        iconBg: 'bg-purple-500/10',
        iconColor: 'text-purple-400',
        border: 'stat-border-purple',
        getValue: (s: SummaryStats) => formatDuration(s.totalLateMinutes),
        unit: '',
    },
    {
        key: 'topViolator',
        label: 'Paling Sering',
        icon: Zap,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-400',
        border: 'stat-border-emerald',
        getValue: (s: SummaryStats) => s.top5[0]?.name || '-',
        unit: (s: SummaryStats) => s.top5[0] ? `${s.top5[0].count}x terlambat` : '',
    },
];

export default function SummaryCards({ stats }: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card, idx) => {
                const Icon = card.icon;
                const value = card.getValue(stats);
                const unit = typeof card.unit === 'function' ? card.unit(stats) : card.unit;

                return (
                    <motion.div
                        key={card.key}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06, duration: 0.4 }}
                        className={`glass-card p-5 ${card.border}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{card.label}</p>
                            <div className={`p-2 ${card.iconBg} rounded-lg`}>
                                <Icon className={`w-4 h-4 ${card.iconColor}`} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`font-bold text-white ${typeof value === 'string' && value.length > 10
                                    ? 'text-lg truncate max-w-[80%]'
                                    : 'text-2xl'
                                }`}>
                                {value}
                            </span>
                            {unit && <span className="text-xs text-zinc-500">{unit}</span>}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
