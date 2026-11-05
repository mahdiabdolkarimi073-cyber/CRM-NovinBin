import { NextRequest, NextResponse } from 'next/server';
import { syncOverdueTasks } from '@/lib/tasks-overdue';

// GET or POST /api/tasks/sync-overdue - Background sync endpoint
export async function GET() {
  try {
    const result = await syncOverdueTasks();
    return NextResponse.json({
      ok: true,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await syncOverdueTasks();
    return NextResponse.json({
      ok: true,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
