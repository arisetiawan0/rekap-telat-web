import { NextResponse } from 'next/server';
import { listRecordsByDateRange } from '@/lib/db/repository';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from') || '';
        const to = searchParams.get('to') || '';
        const records = await listRecordsByDateRange(from, to);
        return NextResponse.json(records);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load records';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
