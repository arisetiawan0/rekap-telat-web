import { boolean, double, index, int, json, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import type { SummaryStats } from '@/lib/types';

export const sessions = mysqlTable('sessions', {
    id: varchar('id', { length: 36 }).primaryKey(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    processedAt: varchar('processed_at', { length: 32 }).notNull(),
    totalCases: int('total_cases').notNull().default(0),
    totalEmployees: int('total_employees').notNull().default(0),
    totalLateMinutes: int('total_late_minutes').notNull().default(0),
    avgLateMinutes: double('avg_late_minutes').notNull().default(0),
    summaryJson: json('summary_json').$type<SummaryStats>().notNull(),
}, (table) => [
    index('idx_sessions_processed_at').on(table.processedAt),
]);

export const records = mysqlTable('records', {
    id: varchar('id', { length: 36 }).primaryKey(),
    sessionId: varchar('session_id', { length: 36 })
        .notNull()
        .references(() => sessions.id, { onDelete: 'cascade' }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    date: varchar('date', { length: 32 }).notNull().default(''),
    shift: varchar('shift', { length: 64 }).notNull().default(''),
    scheduleIn: varchar('schedule_in', { length: 16 }).notNull().default(''),
    scheduleOut: varchar('schedule_out', { length: 16 }).notNull().default(''),
    checkIn: varchar('check_in', { length: 16 }).notNull().default(''),
    checkOut: varchar('check_out', { length: 16 }).notNull().default(''),
    lateMinutes: int('late_minutes').notNull().default(0),
    totalLateCount: int('total_late_count').notNull().default(0),
    isShiftAdjusted: boolean('is_shift_adjusted').notNull().default(false),
    originalSchedule: varchar('original_schedule', { length: 32 }).notNull().default(''),
    organization: varchar('organization', { length: 255 }).notNull().default(''),
    jobPosition: varchar('job_position', { length: 255 }).notNull().default(''),
    jobLevel: varchar('job_level', { length: 255 }).notNull().default(''),
    employmentStatus: varchar('employment_status', { length: 255 }).notNull().default(''),
}, (table) => [
    index('idx_records_session_id').on(table.sessionId),
    index('idx_records_full_name').on(table.fullName),
]);

export type SessionInsert = typeof sessions.$inferInsert;
export type SessionSelect = typeof sessions.$inferSelect;
export type RecordInsert = typeof records.$inferInsert;
export type RecordSelect = typeof records.$inferSelect;
