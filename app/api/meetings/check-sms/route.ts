import { NextRequest, NextResponse } from 'next/server';
import { processSmsReminders } from '@/lib/sms-scheduler';

export async function POST(req: NextRequest) {
  try {
    const result = await processSmsReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[MEETING SMS] خطا:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
