'use client';

import { useState } from 'react';
import { SummaryStats } from '@/lib/excel-processor';
import {
    Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Sector
} from 'recharts';
import { motion } from 'framer-motion';

interface AnalyticsDashboardProps {
    stats: SummaryStats;
}

const COLORS = ['#22d3ee', '#818cf8', '#f472b6', '#fbbf24', '#34d399', '#a78bfa'];

const CustomTooltip = ({ active, payload, label, unit }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-950/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{label || payload[0].name}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }} />
                    <p className="text-sm font-bold text-white">
                        {payload[0].value} <span className="text-zinc-500 font-medium text-xs">{unit || 'Kejadian'}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 8}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                stroke="#fff"
                strokeWidth={1}
                strokeOpacity={0.2}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 12}
                outerRadius={outerRadius + 14}
                fill={fill}
                fillOpacity={0.3}
            />
        </g>
    );
};

export default function AnalyticsDashboard({ stats }: AnalyticsDashboardProps) {
    const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    const onPieLeave = () => {
        setActiveIndex(undefined);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trends Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl h-[400px] flex flex-col group"
            >
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-1">Tren Keterlambatan</h3>
                    <p className="text-sm text-gray-500">Jumlah kejadian terlambat per tanggal</p>
                </div>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.trends}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#71717a"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip unit="Kejadian" />} cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#22d3ee"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorCount)"
                                animationDuration={1500}
                                activeDot={{ r: 6, strokeWidth: 2, stroke: '#000', fill: '#22d3ee' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Shift Distribution */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl h-[400px] flex flex-col group"
            >
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-1">Distribusi Shift</h3>
                    <p className="text-sm text-gray-500">Perbandingan keterlambatan per Shift Code</p>
                </div>
                <div className="flex-1 w-full flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="flex-1 h-full min-h-[250px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.shiftDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                    onMouseEnter={onPieEnter}
                                    onMouseLeave={onPieLeave}
                                    animationBegin={200}
                                    animationDuration={1200}
                                    stroke="none"
                                    shape={(props: any) => {
                                        const isActive = props.index === activeIndex || props.isActive;
                                        if (isActive) {
                                            return renderActiveShape(props);
                                        }
                                        return <Sector {...props} />;
                                    }}
                                >
                                    {stats.shiftDistribution.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            className="outline-none cursor-pointer transition-opacity duration-300"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip label="Shift" />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <motion.p
                                animate={{ scale: activeIndex !== undefined ? 0.9 : 1 }}
                                className="text-xs text-zinc-500 uppercase font-bold tracking-tighter"
                            >
                                {activeIndex !== undefined ? stats.shiftDistribution[activeIndex].name : 'Total'}
                            </motion.p>
                            <motion.p
                                animate={{ scale: activeIndex !== undefined ? 1.1 : 1 }}
                                className="text-2xl font-black text-white"
                            >
                                {activeIndex !== undefined ? stats.shiftDistribution[activeIndex].value : stats.totalCases}
                            </motion.p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 w-full sm:w-56 mt-4 sm:mt-0 p-4 rounded-2xl bg-white/5 border border-white/5">
                        {stats.shiftDistribution.slice(0, 6).map((item, i) => (
                            <div
                                key={i}
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseLeave={() => setActiveIndex(undefined)}
                                className={`flex items-center justify-between text-xs group/item cursor-pointer p-1 rounded-lg transition-colors ${activeIndex === i ? 'bg-white/5' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${activeIndex === i ? 'scale-150 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`}
                                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                    />
                                    <span className={`transition-colors font-bold tracking-tight ${activeIndex === i ? 'text-white' : 'text-zinc-400'}`}>
                                        {item.name}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className={`font-black transition-colors ${activeIndex === i ? 'text-white' : 'text-zinc-300'}`}>
                                        {item.value}
                                    </span>
                                    <span className="text-[10px] text-zinc-600 font-medium font-mono">x</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
