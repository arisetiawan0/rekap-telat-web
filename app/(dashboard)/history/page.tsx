'use client';

import { useData } from '@/lib/context';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History as HistoryIcon,
    FileSpreadsheet,
    Calendar,
    Users,
    AlertTriangle,
    Clock,
    Trash2,
    ArrowRight,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionRow } from '@/lib/database';

export default function HistoryPage() {
    const { sessions, sessionsLoading, loadSession, removeSession, refreshSessions, isProcessing } = useData();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const router = useRouter();

    const handleLoad = async (id: string) => {
        await loadSession(id);
        router.push('/dashboard');
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        await removeSession(id);
        setDeletingId(null);
        setConfirmDelete(null);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Riwayat Upload</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Data analisa yang pernah diupload tersimpan di sini
                    </p>
                </div>
                <button
                    onClick={() => refreshSessions()}
                    disabled={sessionsLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-white/3 hover:bg-white/6 rounded-xl border border-white/6 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={cn('w-4 h-4', sessionsLoading && 'animate-spin')} />
                    Refresh
                </button>
            </div>

            {/* Loading State */}
            {sessionsLoading && sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
                    <p className="text-sm text-zinc-500">Memuat riwayat...</p>
                </div>
            )}

            {/* Empty State */}
            {!sessionsLoading && sessions.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center space-y-4"
                >
                    <div className="w-20 h-20 bg-zinc-800/50 rounded-2xl flex items-center justify-center">
                        <HistoryIcon className="w-8 h-8 text-zinc-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Belum Ada Riwayat</h2>
                        <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                            Upload file absensi terlebih dahulu. Setiap upload otomatis tersimpan di database.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Sessions List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {sessions.map((session, idx) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            index={idx}
                            onLoad={() => handleLoad(session.id)}
                            onDelete={() => {
                                if (confirmDelete === session.id) {
                                    handleDelete(session.id);
                                } else {
                                    setConfirmDelete(session.id);
                                }
                            }}
                            onCancelDelete={() => setConfirmDelete(null)}
                            isDeleting={deletingId === session.id}
                            isConfirmingDelete={confirmDelete === session.id}
                            isLoading={isProcessing}
                            formatDate={formatDate}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ============================================
// Session Card Component
// ============================================
function SessionCard({
    session,
    index,
    onLoad,
    onDelete,
    onCancelDelete,
    isDeleting,
    isConfirmingDelete,
    isLoading,
    formatDate,
}: {
    session: SessionRow;
    index: number;
    onLoad: () => void;
    onDelete: () => void;
    onCancelDelete: () => void;
    isDeleting: boolean;
    isConfirmingDelete: boolean;
    isLoading: boolean;
    formatDate: (d: string) => string;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, height: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.2) }}
            className="glass-card glass-card-hover group overflow-hidden"
        >
            <div className="p-5 flex flex-col sm:flex-row gap-4">
                {/* Left: File Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-cyan-500/8 rounded-xl shrink-0">
                        <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                            {session.file_name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Calendar className="w-3 h-3 text-zinc-600" />
                            <p className="text-[11px] text-zinc-500">
                                {formatDate(session.processed_at)}
                            </p>
                        </div>

                        {/* Stats Row */}
                        <div className="flex flex-wrap gap-4 mt-3">
                            <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-red-400/60" />
                                <span className="text-xs text-zinc-400">
                                    <span className="font-bold text-zinc-300">{session.total_cases}</span> kejadian
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-blue-400/60" />
                                <span className="text-xs text-zinc-400">
                                    <span className="font-bold text-zinc-300">{session.total_employees}</span> karyawan
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-amber-400/60" />
                                <span className="text-xs text-zinc-400">
                                    avg <span className="font-bold text-zinc-300">{Math.round(session.avg_late_minutes)}</span> menit
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex sm:flex-col gap-2 shrink-0 justify-end">
                    <button
                        onClick={onLoad}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-semibold border border-cyan-500/20 transition-all disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                Buka
                                <ArrowRight className="w-3.5 h-3.5" />
                            </>
                        )}
                    </button>

                    {isConfirmingDelete ? (
                        <div className="flex gap-1.5">
                            <button
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-medium border border-red-500/20 transition-all disabled:opacity-50"
                            >
                                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Hapus'}
                            </button>
                            <button
                                onClick={onCancelDelete}
                                className="px-3 py-2 text-zinc-500 hover:text-zinc-300 rounded-xl text-xs transition-colors"
                            >
                                Batal
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onDelete}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-zinc-600 hover:text-red-400 rounded-xl text-xs transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="sm:hidden">Hapus</span>
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
