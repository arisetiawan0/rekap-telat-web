import { NextResponse } from 'next/server';
import { createSessionRecord, listSessions } from '@/lib/db/repository';
import type { AttendanceRecord, SummaryStats } from '@/lib/types';

export async function GET() {
    try {
        const sessions = await listSessions();
        return NextResponse.json(sessions);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load sessions';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as {
            fileName?: string;
            summary?: SummaryStats;
            records?: AttendanceRecord[];
        };

        if (!body.fileName || !body.summary || !Array.isArray(body.records)) {
            return NextResponse.json({ error: 'Invalid session payload' }, { status: 400 });
        }

        const id = await createSessionRecord(body.fileName, body.summary, body.records);
        return NextResponse.json({ id });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create session';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
