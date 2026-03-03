'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Plus, Trash2, Save, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsChange: (settings: AppSettings) => void;
}

export interface AppSettings {
    shifts: string[];
    threshold: number;
}

const DEFAULT_SHIFTS = [
    "06:00", "06:30", "06:45", "07:00", "07:45",
    "09:00", "10:00", "11:00", "12:00", "13:00",
    "13:15", "13:45", "14:30", "14:45", "15:00"
];

const DEFAULT_THRESHOLD = 130;

export default function SettingsPanel({ isOpen, onClose, onSettingsChange }: SettingsPanelProps) {
    const [shifts, setShifts] = useState<string[]>(DEFAULT_SHIFTS);
    const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);
    const [newShift, setNewShift] = useState("");

    // Load from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('rekap_telat_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setShifts(parsed.shifts || DEFAULT_SHIFTS);
                setThreshold(parsed.threshold || DEFAULT_THRESHOLD);
                onSettingsChange(parsed);
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        } else {
            onSettingsChange({ shifts: DEFAULT_SHIFTS, threshold: DEFAULT_THRESHOLD });
        }
    }, []);

    const handleSave = () => {
        const newSettings = { shifts, threshold };
        localStorage.setItem('rekap_telat_settings', JSON.stringify(newSettings));
        onSettingsChange(newSettings);
        onClose();
    };

    const addShift = () => {
        if (newShift && !shifts.includes(newShift)) {
            // Basic validation
            if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(newShift)) return;
            setShifts([...shifts].sort());
            setShifts(prev => [...prev, newShift].sort());
            setNewShift("");
        }
    };

    const removeShift = (idx: number) => {
        setShifts(shifts.filter((_, i) => i !== idx));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-sm bg-zinc-950 border-l border-white/10 p-6 z-[101] shadow-2xl flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Settings className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Pengaturan</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                            {/* Threshold Section */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-widest">
                                    <Info className="w-4 h-4" />
                                    Smart Shift Threshold
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Batas waktu (menit) sebelum sistem menganggap karyawan melakukan tukar shift atau masuk di hari libur.
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            value={threshold}
                                            onChange={(e) => setThreshold(Number(e.target.value))}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                        />
                                        <span className="text-sm font-medium text-gray-400">Menit</span>
                                    </div>
                                </div>
                            </section>

                            {/* Shifts Section */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-widest">
                                    Standard Shift Times
                                </div>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="HH:MM (e.g. 08:30)"
                                            value={newShift}
                                            onChange={(e) => setNewShift(e.target.value)}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-700 outline-none"
                                        />
                                        <button
                                            onClick={addShift}
                                            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {shifts.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 text-sm">
                                                <span className="font-mono text-gray-300">{s}</span>
                                                <button onClick={() => removeShift(i)} className="p-1 hover:text-red-400 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="pt-6 mt-6 border-t border-white/5">
                            <button
                                onClick={handleSave}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                            >
                                <Save className="w-5 h-5" />
                                Simpan Perubahan
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
