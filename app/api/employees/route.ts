import { NextResponse } from 'next/server';
import { listEmployeesAggregated } from '@/lib/db/repository';

export async function GET() {
    try {
        const employees = await listEmployeesAggregated();
        return NextResponse.json(employees);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load employees';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
