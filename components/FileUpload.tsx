'use client';

import { UploadCloud, FileSpreadsheet, X, ArrowRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface FileUploadProps {
    onFileSelect: (file: File) => Promise<void>;
    isProcessing: boolean;
}

export default function FileUpload({ onFileSelect, isProcessing }: FileUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [stagedFile, setStagedFile] = useState<File | null>(null);
    const router = useRouter();

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setStagedFile(file);
            } else {
                alert('Mohon upload file Excel (.xlsx)');
            }
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setStagedFile(e.target.files[0]);
        }
    };

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setStagedFile(null);
    };

    const handleProcess = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (stagedFile) {
            try {
                await onFileSelect(stagedFile);
                router.push('/dashboard');
            } catch {
                // Error handled by context
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xl mx-auto"
        >
            <div
                className={cn(
                    'relative group cursor-pointer flex flex-col items-center justify-center w-full h-72 rounded-2xl transition-all duration-300 border-2 border-dashed',
                    isDragOver
                        ? 'border-cyan-500/50 bg-cyan-500/6 shadow-[0_0_40px_rgba(34,211,238,0.15)] scale-[1.01]'
                        : stagedFile
                            ? 'border-emerald-500/30 bg-emerald-500/4'
                            : 'border-white/8 bg-white/1 hover:bg-white/2 hover:border-white/12',
                    isProcessing && 'opacity-50 pointer-events-none'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !stagedFile && document.getElementById('file-upload')?.click()}
            >
                <input
                    id="file-upload"
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleChange}
                    disabled={isProcessing || !!stagedFile}
                />

                <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center space-y-6 w-full">
                    <AnimatePresence mode="wait">
                        {!stagedFile ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center gap-5"
                            >
                                <div className={cn(
                                    'p-4 rounded-2xl transition-all duration-300',
                                    isDragOver
                                        ? 'bg-cyan-500/20 text-cyan-400'
                                        : 'bg-zinc-800/60 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-300'
                                )}>
                                    {isProcessing ? (
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
                                    ) : (
                                        <UploadCloud className="w-8 h-8" />
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-base font-semibold text-zinc-200">
                                        Upload File Absensi
                                    </h3>
                                    <p className="text-sm text-zinc-600 max-w-xs mx-auto">
                                        Drag & drop file .xlsx di sini, atau klik untuk memilih
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/2 border border-white/4 text-[11px] text-zinc-600">
                                    <FileSpreadsheet className="w-3 h-3" />
                                    Format: .xlsx, .xls
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="staged"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center w-full"
                            >
                                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-emerald-500/30">
                                    <FileSpreadsheet className="w-7 h-7" />
                                </div>

                                <h3 className="text-base font-semibold text-white mb-1 max-w-[80%] truncate">
                                    {stagedFile.name}
                                </h3>
                                <p className="text-xs text-zinc-500 mb-6">
                                    {(stagedFile.size / 1024).toFixed(1)} KB • Siap diproses
                                </p>

                                <div className="flex gap-3 w-full max-w-xs">
                                    <button
                                        onClick={clearFile}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/4 hover:bg-white/6 text-zinc-400 text-sm font-medium transition-colors border border-white/6"
                                    >
                                        Ganti File
                                    </button>
                                    <button
                                        onClick={handleProcess}
                                        disabled={isProcessing}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        ) : (
                                            <>
                                                <span>Analisis</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
