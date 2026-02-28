'use client';

import { useData } from '@/lib/context';
import FileUpload from '@/components/FileUpload';
import { motion } from 'framer-motion';

export default function UploadPage() {
    const { processFile, isProcessing, error } = useData();

    return (
        <div className="space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Upload Absensi</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Upload file Excel (.xlsx) dari sistem absensi untuk mulai analisa
                </p>
            </div>

            {/* Upload Area */}
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <FileUpload onFileSelect={processFile} isProcessing={isProcessing} />
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md text-center"
                    >
                        {error}
                    </motion.div>
                )}
            </div>

            {/* Info */}
            <div className="text-center">
                <p className="text-xs text-zinc-600">
                    Setiap upload otomatis tersimpan di database dan bisa diakses kembali dari halaman{' '}
                    <a href="/history" className="text-cyan-500 hover:text-cyan-400 transition-colors">Riwayat</a>
                </p>
            </div>
        </div>
    );
}
