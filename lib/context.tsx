'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AttendanceRecord, SummaryStats, AppSettings } from './types';
import { processExcelFile } from './excel-processor';
import { createSession, getSessions, getSessionById, deleteSession, type SessionRow } from './database';

// ============================================
// Types
// ============================================

interface DataContextType {
    // Data state
    data: AttendanceRecord[];
    summary: SummaryStats | null;
    isProcessing: boolean;
    error: string | null;

    // Settings
    settings: AppSettings;
    updateSettings: (settings: AppSettings) => void;

    // Actions
    processFile: (file: File) => Promise<void>;
    resetData: () => void;

    // Database sessions
    sessions: SessionRow[];
    sessionsLoading: boolean;
    loadSession: (id: string) => Promise<void>;
    removeSession: (id: string) => Promise<void>;
    refreshSessions: () => Promise<void>;

    // Meta
    currentFileName: string | null;
    currentSessionId: string | null;
}

// ============================================
// Defaults
// ============================================
const DEFAULT_SHIFTS = [
    '06:00', '06:30', '06:45', '07:00', '07:45',
    '09:00', '10:00', '11:00', '12:00', '13:00',
    '13:15', '13:45', '14:30', '14:45', '15:00',
];

const DEFAULT_SETTINGS: AppSettings = {
    shifts: DEFAULT_SHIFTS,
    threshold: 130,
};

// ============================================
// Context
// ============================================
const DataContext = createContext<DataContextType | null>(null);

export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be used within DataProvider');
    return ctx;
}

// ============================================
// Provider
// ============================================
export function DataProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<AttendanceRecord[]>([]);
    const [summary, setSummary] = useState<SummaryStats | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [currentFileName, setCurrentFileName] = useState<string | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);

    // Load settings from localStorage
    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem('rekap_telat_settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setSettings({
                    shifts: parsed.shifts || DEFAULT_SHIFTS,
                    threshold: parsed.threshold || 130,
                });
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    }, []);

    // Load sessions from Supabase on mount, then auto-load latest
    useEffect(() => {
        (async () => {
            setSessionsLoading(true);
            try {
                const rows = await getSessions();
                setSessions(rows);

                // Auto-load the latest session if no data is currently loaded
                if (rows.length > 0 && data.length === 0) {
                    const latest = rows[0]; // already sorted by processed_at DESC
                    const result = await getSessionById(latest.id);
                    if (result) {
                        setData(result.records);
                        setSummary(result.summary);
                        setCurrentFileName(result.session.file_name);
                        setCurrentSessionId(latest.id);
                    }
                }
            } catch (e) {
                console.error('Failed to load sessions', e);
            } finally {
                setSessionsLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const rows = await getSessions();
            setSessions(rows);
        } catch (e) {
            console.error('Failed to load sessions', e);
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    const updateSettings = useCallback((newSettings: AppSettings) => {
        setSettings(newSettings);
        localStorage.setItem('rekap_telat_settings', JSON.stringify(newSettings));
    }, []);

    const processFile = useCallback(async (file: File) => {
        setIsProcessing(true);
        setError(null);
        try {
            // Check for duplicate filename
            const duplicate = sessions.find(s => s.file_name === file.name);
            if (duplicate) {
                const confirmed = window.confirm(
                    `File "${file.name}" sudah pernah diupload pada ${new Date(duplicate.processed_at).toLocaleDateString('id-ID')}.\n\nLanjutkan upload? Data lama tidak akan dihapus.`
                );
                if (!confirmed) {
                    setIsProcessing(false);
                    return;
                }
            }

            const result = await processExcelFile(file, settings.shifts, settings.threshold);
            setData(result.data);
            setSummary(result.summary);
            setCurrentFileName(file.name);

            // Save to Supabase
            const sessionId = await createSession(file.name, result.summary, result.data);
            if (sessionId) {
                setCurrentSessionId(sessionId);
                await refreshSessions();
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Gagal memproses file.';
            setError(msg);
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [settings, refreshSessions, sessions]);

    const loadSession = useCallback(async (id: string) => {
        setIsProcessing(true);
        setError(null);
        try {
            const result = await getSessionById(id);
            if (!result) {
                setError('Session tidak ditemukan.');
                return;
            }
            setData(result.records);
            setSummary(result.summary);
            setCurrentFileName(result.session.file_name);
            setCurrentSessionId(id);
        } catch (err) {
            setError('Gagal memuat data session.');
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const removeSession = useCallback(async (id: string) => {
        const success = await deleteSession(id);
        if (success) {
            // If currently viewing this session, clear it
            if (currentSessionId === id) {
                setData([]);
                setSummary(null);
                setCurrentFileName(null);
                setCurrentSessionId(null);
            }
            await refreshSessions();
        }
    }, [currentSessionId, refreshSessions]);

    const resetData = useCallback(() => {
        setData([]);
        setSummary(null);
        setError(null);
        setCurrentFileName(null);
        setCurrentSessionId(null);
    }, []);

    return (
        <DataContext.Provider value={{
            data,
            summary,
            isProcessing,
            error,
            settings,
            updateSettings,
            processFile,
            resetData,
            sessions,
            sessionsLoading,
            loadSession,
            removeSession,
            refreshSessions,
            currentFileName,
            currentSessionId,
        }}>
            {children}
        </DataContext.Provider>
    );
}
