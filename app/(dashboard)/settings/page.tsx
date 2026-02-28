'use client';

import { useData } from '@/lib/context';
import { useState } from 'react';
import { Settings, Plus, Trash2, Save, Info, RotateCcw, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_SHIFTS = [
    '06:00', '06:30', '06:45', '07:00', '07:45',
    '09:00', '10:00', '11:00', '12:00', '13:00',
    '13:15', '13:45', '14:30', '14:45', '15:00',
];

export default function SettingsPage() {
    const { settings, updateSettings, resetData } = useData();
    const [shifts, setShifts] = useState<string[]>(settings.shifts);
    const [threshold, setThreshold] = useState<number>(settings.threshold);
    const [newShift, setNewShift] = useState('');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        updateSettings({ shifts, threshold });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const addShift = () => {
        if (newShift && !shifts.includes(newShift)) {
            if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(newShift)) return;
            setShifts(prev => [...prev, newShift].sort());
            setNewShift('');
        }
    };

    const removeShift = (idx: number) => {
        setShifts(shifts.filter((_, i) => i !== idx));
    };

    const resetShifts = () => {
        setShifts(DEFAULT_SHIFTS);
    };

    return (
        <div className="space-y-8 max-w-2xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Pengaturan</h1>
                <p className="text-sm text-zinc-500 mt-1">Kelola konfigurasi analisis keterlambatan</p>
            </div>

            {/* Threshold Section */}
            <section className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Info className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Smart Shift Threshold</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Batas waktu (menit) sebelum sistem menganggap karyawan melakukan tukar shift atau masuk di hari libur
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 pl-12">
                    <input
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-32 bg-zinc-900/80 border border-white/6 rounded-xl px-4 py-2.5 text-white text-center font-mono focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                    />
                    <span className="text-sm font-medium text-zinc-500">Menit</span>
                </div>
            </section>

            {/* Shifts Section */}
            <section className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                            <Settings className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">Standard Shift Times</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Daftar jam shift yang dijadikan acuan smart detection</p>
                        </div>
                    </div>
                    <button
                        onClick={resetShifts}
                        className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition-colors"
                        title="Reset ke default"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                    </button>
                </div>

                <div className="space-y-3 pl-12">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="HH:MM (e.g. 08:30)"
                            value={newShift}
                            onChange={(e) => setNewShift(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addShift()}
                            className="flex-1 bg-zinc-900/80 border border-white/6 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-700 outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        />
                        <button
                            onClick={addShift}
                            className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {shifts.map((s, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/3 rounded-xl border border-white/4 text-sm group">
                                <span className="font-mono text-zinc-300">{s}</span>
                                <button
                                    onClick={() => removeShift(i)}
                                    className="p-0.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Data Management */}
            <section className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Data Management</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Reset data yang sedang dimuat saat ini</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 pl-12">
                    <button
                        onClick={resetData}
                        className="px-4 py-2 text-sm font-medium text-zinc-300 bg-white/3 hover:bg-white/6 rounded-xl border border-white/6 transition-all"
                    >
                        Reset Data Saat Ini
                    </button>
                    <p className="text-xs text-zinc-600 self-center">
                        Kelola riwayat upload di halaman{' '}
                        <a href="/history" className="text-cyan-500 hover:text-cyan-400 transition-colors">Riwayat</a>
                    </p>
                </div>
            </section>

            {/* Save Button */}
            <div className="sticky bottom-4">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleSave}
                    className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-cyan-900/20 transition-all"
                >
                    <AnimatePresence mode="wait">
                        {saved ? (
                            <motion.span
                                key="saved"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="flex items-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Tersimpan!
                            </motion.span>
                        ) : (
                            <motion.span
                                key="save"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="flex items-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                Simpan Perubahan
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </div>
    );
}
