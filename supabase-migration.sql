-- ============================================
-- Supabase SQL Migration untuk Rekap Telat Web
-- Jalankan ini di Supabase SQL Editor
-- ============================================

-- Table: sessions (menyimpan setiap upload file)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    total_cases INTEGER DEFAULT 0,
    total_employees INTEGER DEFAULT 0,
    total_late_minutes INTEGER DEFAULT 0,
    avg_late_minutes REAL DEFAULT 0,
    summary_json JSONB
);

-- Table: records (menyimpan data keterlambatan per baris)
CREATE TABLE IF NOT EXISTS records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    date TEXT,
    shift TEXT,
    schedule_in TEXT,
    schedule_out TEXT,
    check_in TEXT,
    check_out TEXT,
    late_minutes INTEGER DEFAULT 0,
    total_late_count INTEGER DEFAULT 0,
    is_shift_adjusted BOOLEAN DEFAULT FALSE,
    original_schedule TEXT,
    organization TEXT,
    job_position TEXT,
    job_level TEXT,
    employment_status TEXT
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_records_session_id ON records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_full_name ON records(full_name);
CREATE INDEX IF NOT EXISTS idx_sessions_processed_at ON sessions(processed_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Public access policy (tanpa auth untuk sekarang)
-- Nanti bisa diubah saat fitur auth ditambahkan
DROP POLICY IF EXISTS "Allow all access to sessions" ON sessions;
CREATE POLICY "Allow all access to sessions" ON sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to records" ON records;
CREATE POLICY "Allow all access to records" ON records FOR ALL USING (true);
