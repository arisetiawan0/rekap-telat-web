'use client';

import { UploadCloud, FileSpreadsheet, X, ArrowRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    isProcessing: boolean;
}

export default function FileUpload({ onFileSelect, isProcessing }: FileUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [stagedFile, setStagedFile] = useState<File | null>(null);

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

    const handleProcess = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (stagedFile) {
            onFileSelect(stagedFile);
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
                className={clsx(
                    "relative group cursor-pointer flex flex-col items-center justify-center w-full h-80 rounded-3xl transition-all duration-300 backdrop-blur-xl border-2",
                    isDragOver
                        ? "border-blue-500/50 bg-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.3)] scale-[1.02]"
                        : stagedFile
                            ? "border-green-500/30 bg-green-900/10 shadow-[0_0_30px_rgba(34,197,94,0.1)]"
                            : "border-white/10 bg-black/40 hover:bg-black/50 hover:border-white/20 shadow-xl",
                    isProcessing && "opacity-50 pointer-events-none"
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

                {/* Animated Background Gradient Blob */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl z-0 pointer-events-none">
                    {!stagedFile && (
                        <>
                            <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        </>
                    )}
                    {stagedFile && (
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 transition-opacity" />
                    )}
                </div>

                <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center space-y-6 w-full">

                    <AnimatePresence mode="wait">
                        {!stagedFile ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div className={clsx(
                                    "p-5 rounded-2xl transition-all duration-500 shadow-lg",
                                    isDragOver ? "bg-blue-500 text-white shadow-blue-500/30" : "bg-zinc-800 text-gray-400 group-hover:bg-zinc-700 group-hover:text-white"
                                )}>
                                    {isProcessing ? (
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                                    ) : (
                                        <UploadCloud className="w-10 h-10" />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white tracking-tight">
                                        Upload File Absensi
                                    </h3>
                                    <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">
                                        Drag & drop file .xlsx di sini, atau klik untuk menjelajah
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-500">
                                    <span>Supported: .xlsx, .xls</span>
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
                                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                                    <FileSpreadsheet className="w-8 h-8" />
                                </div>

                                <h3 className="text-lg font-semibold text-white mb-1 max-w-[80%] truncate">
                                    {stagedFile.name}
                                </h3>
                                <p className="text-xs text-gray-400 mb-8">
                                    {(stagedFile.size / 1024).toFixed(1)} KB • Siap diproses
                                </p>

                                <div className="flex gap-3 w-full max-w-xs">
                                    <button
                                        onClick={clearFile}
                                        className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors border border-white/10"
                                    >
                                        Ganti File
                                    </button>
                                    <button
                                        onClick={handleProcess}
                                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 group/btn"
                                    >
                                        <span>Analisis</span>
                                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
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
