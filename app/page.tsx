'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import ResultsTable from '@/components/ResultsTable';
import SummaryCards from '@/components/SummaryCards';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import SettingsPanel, { AppSettings } from '@/components/SettingsPanel';
import { processExcelFile, AttendanceRecord, SummaryStats } from '@/lib/excel-processor';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, History, Settings as SettingsIcon } from 'lucide-react';

export default function Home() {
    const [data, setData] = useState<AttendanceRecord[]>([]);
    const [summary, setSummary] = useState<SummaryStats | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settings, setSettings] = useState<AppSettings | null>(null);

    const handleFileSelect = async (file: File) => {
        setIsProcessing(true);
        try {
            const shifts = settings?.shifts || [];
            const threshold = settings?.threshold || 130;

            const result = await processExcelFile(file, shifts, threshold);
            setData(result.data);
            setSummary(result.summary);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Gagal memproses file.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setData([]);
        setSummary(null);
    };

    return (
        <main className="min-h-screen relative overflow-hidden bg-black font-[family-name:var(--font-geist-sans)] selection:bg-blue-500/30">
            {/* Animated Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-500/5 blur-[100px] rounded-full animate-pulse [animation-delay:4s]" />
            </div>

            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSettingsChange={setSettings}
            />

            <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-12">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col md:flex-row justify-between items-center gap-6 mb-16"
                >
                    <div className="space-y-2 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase">
                            <Sparkles className="w-3 h-3" />
                            Versi 1.1
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
                            Rekap <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Keterlambatan</span>
                        </h1>
                        <p className="text-gray-500 text-lg font-medium">Analisis absensi karyawan dengan cepat, akurat, dan elegan.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsSettingsOpen(true)}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all transition-colors flex items-center gap-3 text-sm font-semibold"
                        >
                            <SettingsIcon className="w-4 h-4" />
                            Pengaturan
                        </motion.button>
                        {data.length > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleReset}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all transition-colors flex items-center gap-2 text-sm font-semibold"
                            >
                                <History className="w-4 h-4" />
                                Reset Data
                            </motion.button>
                        )}
                    </div>
                </motion.div>

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

                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em]">Visual Analytics</h2>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>
                                {summary && <AnalyticsDashboard stats={summary} />}
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em]">Data Detail</h2>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>
                                <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-white/5 p-1 overflow-hidden shadow-2xl">
                                    <ResultsTable data={data} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <footer className="mt-20 py-8 border-t border-white/5 flex flex-col items-center gap-4">
                    <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Beauty Rekap System. Premium Experience.</p>
                </footer>
            </div>
        </main>
    );
}
