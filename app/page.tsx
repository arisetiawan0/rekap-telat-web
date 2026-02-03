'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import ResultsTable from '@/components/ResultsTable';
import SummaryCards from '@/components/SummaryCards';
import { processExcelFile, AttendanceRecord, SummaryStats } from '@/lib/excel-processor';
import { RefreshCcw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
    const [data, setData] = useState<AttendanceRecord[]>([]);
    const [summary, setSummary] = useState<SummaryStats | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = async (file: File) => {
        setIsProcessing(true);
        setError(null);
        try {
            const result = await processExcelFile(file);
            setData(result.data);
            setSummary(result.summary);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Terjadi kesalahan saat memproses file.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setData([]);
        setSummary(null);
        setError(null);
    };

    return (
        <main className="min-h-screen relative overflow-hidden bg-black font-[family-name:var(--font-geist-sans)] selection:bg-blue-500/30">

            {/* Animated Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
                <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-emerald-900/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-12">

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col md:flex-row justify-between items-center gap-6 mb-16"
                >
                    <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-400 mb-4 backdrop-blur-sm">
                            <Sparkles className="w-3 h-3" />
                            <span>Versi 1.0</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                            Rekap Keterlambatan
                        </h1>
                        <p className="text-lg text-gray-400 max-w-md leading-relaxed">
                            Analisis absensi karyawan dengan cepat, akurat, dan elegan.
                        </p>
                    </div>

                    {data.length > 0 && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleReset}
                            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-white/10 border border-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition-all shadow-lg"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Reset Data
                        </motion.button>
                    )}
                </motion.div>

                {/* Error Alert */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-8"
                        >
                            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-200 text-sm backdrop-blur-md text-center">
                                {error}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <AnimatePresence mode='wait'>
                    {data.length === 0 ? (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                            transition={{ duration: 0.4 }}
                            className="flex flex-col items-center justify-center min-h-[50vh]"
                        >
                            <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="space-y-12"
                        >
                            <SummaryCards stats={summary!} />
                            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-white/5 p-1 overflow-hidden shadow-2xl">
                                <ResultsTable data={data} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="mt-20 text-center text-xs text-zinc-600 dark:text-zinc-600"
                >
                    &copy; {new Date().getFullYear()} Beauty Rekap System
                </motion.div>

            </div>
        </main>
    );
}
