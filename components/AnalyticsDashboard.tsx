'use client';

import { useState } from 'react';
import type { SummaryStats } from '@/lib/types';
import {
    Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Sector,
    BarChart, Bar,
} from 'recharts';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';
import { motion } from 'framer-motion';
import { CHART_COLORS } from '@/lib/utils';

interface AnalyticsDashboardProps {
    stats: SummaryStats;
}

// ============================================
// Custom Tooltip
// ============================================
interface CustomTooltipEntry {
    color?: string;
    name?: string;
    value?: string | number;
    payload?: {
        fill?: string;
    };
}

interface CustomTooltipProps {
    active?: boolean;
    label?: string;
    payload?: CustomTooltipEntry[];
    unit?: string;
}

const CustomTooltip = ({ active, payload, label, unit }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        return (
            <div className="bg-zinc-950/95 backdrop-blur-xl border border-white/8 p-3 rounded-xl shadow-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                    {label || item.name}
                </p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.payload?.fill || item.color }} />
                    <p className="text-sm font-bold text-white">
                        {item.value} <span className="text-zinc-500 font-medium text-xs">{unit || 'Kejadian'}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

// ============================================
// Active Pie Sector
// ============================================
const renderActiveShape = (props: PieSectorDataItem) => {
    const {
        cx = 0,
        cy = 0,
        innerRadius = 0,
        outerRadius = 0,
        startAngle = 0,
        endAngle = 0,
        fill = '#22d3ee',
    } = props;
    return (
        <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} stroke="#fff" strokeWidth={1} strokeOpacity={0.1} />
            <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 10} outerRadius={outerRadius + 12} fill={fill} fillOpacity={0.2} />
        </g>
    );
};

export default function AnalyticsDashboard({ stats }: AnalyticsDashboardProps) {
    const [activeShiftIdx, setActiveShiftIdx] = useState<number | undefined>(undefined);
    const [activeSevIdx, setActiveSevIdx] = useState<number | undefined>(undefined);

    // Top 10 bar chart data
    const top10Data = stats.employeeSummaries
        .slice(0, 10)
        .map(e => ({
            name: e.name.length > 15 ? e.name.substring(0, 15) + '…' : e.name,
            fullName: e.name,
            count: e.totalLateCount,
        }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trends Chart */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 h-[380px] flex flex-col"
            >
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-white">Tren Keterlambatan</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Jumlah kejadian per tanggal</p>
                </div>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.trends}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                            <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dx={-8} />
                            <Tooltip content={<CustomTooltip unit="Kejadian" />} cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" animationDuration={1200} activeDot={{ r: 5, strokeWidth: 2, stroke: '#09090b', fill: '#22d3ee' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Shift Distribution Donut */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-5 h-[380px] flex flex-col"
            >
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-white">Distribusi Shift</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Keterlambatan per Shift Code</p>
                </div>
                <div className="flex-1 w-full flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="flex-1 h-full min-h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.shiftDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={6}
                                    dataKey="value"
                                    onMouseEnter={(_, i) => setActiveShiftIdx(i)}
                                    onMouseLeave={() => setActiveShiftIdx(undefined)}
                                    animationDuration={1000}
                                    stroke="none"
                                    shape={(props) => props.index === activeShiftIdx ? renderActiveShape(props) : <Sector {...props} />}
                                >
                                    {stats.shiftDistribution.map((_, i) => (
                                        <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} className="outline-none cursor-pointer" />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip label="Shift" />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">
                                {activeShiftIdx !== undefined ? stats.shiftDistribution[activeShiftIdx]?.name : 'Total'}
                            </p>
                            <p className="text-xl font-black text-white">
                                {activeShiftIdx !== undefined ? stats.shiftDistribution[activeShiftIdx]?.value : stats.totalCases}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-48 p-3 rounded-xl bg-white/2 border border-white/4">
                        {stats.shiftDistribution.slice(0, 6).map((item, i) => (
                            <div
                                key={i}
                                onMouseEnter={() => setActiveShiftIdx(i)}
                                onMouseLeave={() => setActiveShiftIdx(undefined)}
                                className={`flex items-center justify-between text-xs cursor-pointer p-1.5 rounded-lg transition-colors ${activeShiftIdx === i ? 'bg-white/4' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full transition-transform ${activeShiftIdx === i ? 'scale-150' : ''}`} style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                    <span className={`font-medium ${activeShiftIdx === i ? 'text-white' : 'text-zinc-400'}`}>{item.name}</span>
                                </div>
                                <span className={`font-bold ${activeShiftIdx === i ? 'text-white' : 'text-zinc-300'}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Top 10 Bar Chart */}
            {top10Data.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-5 h-[380px] flex flex-col"
                >
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-white">Top 10 Karyawan</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Karyawan dengan keterlambatan terbanyak</p>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={top10Data} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                                <XAxis type="number" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} width={110} />
                                <Tooltip content={<CustomTooltip unit="kali" />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={1200}>
                                    {top10Data.map((_, i) => (
                                        <Cell key={i} fill={i < 3 ? '#f87171' : i < 6 ? '#fbbf24' : '#22d3ee'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            )}

            {/* Severity Breakdown Donut */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-5 h-[380px] flex flex-col"
            >
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-white">Tingkat Keparahan</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Ringan (≤15m), Sedang (16-60m), Berat (&gt;60m)</p>
                </div>
                <div className="flex-1 w-full flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="flex-1 h-full min-h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.severityBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={6}
                                    dataKey="value"
                                    onMouseEnter={(_, i) => setActiveSevIdx(i)}
                                    onMouseLeave={() => setActiveSevIdx(undefined)}
                                    animationDuration={1000}
                                    stroke="none"
                                    shape={(props) => props.index === activeSevIdx ? renderActiveShape(props) : <Sector {...props} />}
                                >
                                    {stats.severityBreakdown.map((entry, i) => (
                                        <Cell key={`cell-sev-${i}`} fill={entry.color} className="outline-none cursor-pointer" />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip label="Tingkat" />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">
                                {activeSevIdx !== undefined ? stats.severityBreakdown[activeSevIdx]?.name : 'Total'}
                            </p>
                            <p className="text-xl font-black text-white">
                                {activeSevIdx !== undefined ? stats.severityBreakdown[activeSevIdx]?.value : stats.totalCases}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 w-full sm:w-48 p-3 rounded-xl bg-white/2 border border-white/4">
                        {stats.severityBreakdown.map((item, i) => (
                            <div
                                key={i}
                                onMouseEnter={() => setActiveSevIdx(i)}
                                onMouseLeave={() => setActiveSevIdx(undefined)}
                                className={`flex items-center justify-between text-xs cursor-pointer p-1.5 rounded-lg transition-colors ${activeSevIdx === i ? 'bg-white/4' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${activeSevIdx === i ? 'scale-150' : ''} transition-transform`} style={{ backgroundColor: item.color }} />
                                    <span className={`font-medium ${activeSevIdx === i ? 'text-white' : 'text-zinc-400'}`}>{item.name}</span>
                                </div>
                                <span className={`font-bold ${activeSevIdx === i ? 'text-white' : 'text-zinc-300'}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
