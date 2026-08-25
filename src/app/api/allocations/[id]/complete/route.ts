import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const allocationId = parseInt(params.id, 10);
    const body = await req.json().catch(() => ({}));

    if (isNaN(allocationId)) {
      return NextResponse.json({ error: 'Invalid allocation ID.' }, { status: 400 });
    }

    const { notes } = body;

    // Call stored procedure sp_complete_handover
    const procRes = await query(
      `SELECT sp_complete_handover($1, $2, $3) AS result;`,
      [allocationId, user.id, notes || 'Physical handover confirmed by department staff']
    );

    const result = procRes.rows[0]?.result;

    if (!result || !result.success) {
      return NextResponse.json({ error: result?.error || 'Handover completion failed.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      transfer_id: result.transfer_id,
      message: result.message,
      details: result,
    });
  } catch (error: any) {
    console.error('[Handover Complete Error]', error);
    return NextResponse.json({ error: error?.message || 'Handover completion error.' }, { status: 500 });
  }
}
