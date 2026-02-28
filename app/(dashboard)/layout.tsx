'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { DataProvider, useData } from '@/lib/context';
import {
    Upload,
    LayoutDashboard,
    History,
    Users,
    Settings,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Activity,
    FileSpreadsheet,
    GitCompareArrows,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

// ============================================
// Navigation Config
// ============================================
const NAV_GROUPS = [
    {
        label: 'Analitik',
        items: [
            { href: '/upload', label: 'Upload', icon: Upload },
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/comparison', label: 'Perbandingan', icon: GitCompareArrows },
            { href: '/history', label: 'Riwayat', icon: History },
            { href: '/employees', label: 'Karyawan', icon: Users },
        ],
    },
    {
        label: 'Manajemen',
        items: [
            { href: '/settings', label: 'Pengaturan', icon: Settings },
        ],
    },
];

// ============================================
// Sidebar Component
// ============================================
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
    const pathname = usePathname();
    const { data, currentFileName } = useData();

    return (
        <aside
            className={cn(
                'hidden lg:flex flex-col h-screen bg-zinc-950/80 backdrop-blur-xl border-r border-white/4 transition-all duration-300 sticky top-0',
                collapsed ? 'w-[72px]' : 'w-[260px]'
            )}
        >
            {/* Brand */}
            <div className={cn(
                'flex items-center h-16 px-4 border-b border-white/4 shrink-0',
                collapsed ? 'justify-center' : 'gap-3'
            )}>
                <div className="w-8 h-8 bg-linear-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-white" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-sm font-bold text-white tracking-tight truncate">Rekap Telat</h1>
                        <p className="text-[10px] text-zinc-500 font-medium">Analytics System</p>
                    </div>
                )}
            </div>

            {/* Data Status Indicator */}
            {data.length > 0 && !collapsed && (
                <div className="mx-3 mt-3 p-2.5 rounded-xl bg-emerald-500/6 border border-emerald-500/10">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-[11px] text-emerald-300 font-medium truncate">{currentFileName}</span>
                    </div>
                    <p className="text-[10px] text-emerald-500/80 mt-1">{data.length} record terlambat</p>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                {NAV_GROUPS.map((group) => (
                    <div key={group.label}>
                        {!collapsed && (
                            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] px-3 mb-2">
                                {group.label}
                            </p>
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'sidebar-link',
                                            isActive && 'active',
                                            collapsed && 'justify-center px-0'
                                        )}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive && 'text-cyan-400')} />
                                        {!collapsed && <span>{item.label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Collapse Toggle */}
            <div className="p-3 border-t border-white/4 shrink-0">
                <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-white/4 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : (
                        <>
                            <ChevronLeft className="w-4 h-4" />
                            <span>Ciutkan</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}

// ============================================
// Mobile Header
// ============================================
function MobileHeader({ onMenuOpen }: { onMenuOpen: () => void }) {
    return (
        <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-14 px-4 bg-zinc-950/90 backdrop-blur-xl border-b border-white/4">
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-linear-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-white" />
                </div>
                <h1 className="text-sm font-bold text-white">Rekap Telat</h1>
            </div>
            <button onClick={onMenuOpen} className="p-2 rounded-lg hover:bg-white/4 text-zinc-400">
                <Menu className="w-5 h-5" />
            </button>
        </header>
    );
}

// ============================================
// Mobile Drawer
// ============================================
function MobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
                    />
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 h-full w-72 bg-zinc-950 border-r border-white/4 z-[101] lg:hidden"
                    >
                        <div className="flex items-center justify-between h-14 px-4 border-b border-white/4">
                            <h2 className="text-sm font-bold text-white">Menu</h2>
                            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/4 text-zinc-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <nav className="px-3 py-4 space-y-6">
                            {NAV_GROUPS.map((group) => (
                                <div key={group.label}>
                                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] px-3 mb-2">
                                        {group.label}
                                    </p>
                                    <div className="space-y-0.5">
                                        {group.items.map((item) => {
                                            const isActive = pathname === item.href;
                                            const Icon = item.icon;
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={onClose}
                                                    className={cn('sidebar-link', isActive && 'active')}
                                                >
                                                    <Icon className={cn('w-[18px] h-[18px]', isActive && 'text-cyan-400')} />
                                                    <span>{item.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// Dashboard Layout
// ============================================
function DashboardShell({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-[#09090b]">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            <MobileHeader onMenuOpen={() => setMobileMenuOpen(true)} />
            <MobileDrawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

            <main className="flex-1 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

// ============================================
// Export Layout
// ============================================
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DataProvider>
            <DashboardShell>{children}</DashboardShell>
        </DataProvider>
    );
}
