import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';

/**
 * Hafalan sebelum bergabung, diisi sendiri oleh thalibah per rentang halaman.
 * Tidak memengaruhi poin, streak, heatmap, maupun kunci halaman target.
 */

function parseRange(body: any): { start: number; end: number } | null {
  const start = Math.floor(Number(body?.start_page));
  const end = Math.floor(Number(body?.end_page ?? body?.start_page));
  if (!start || !end || start < 1 || end > 604 || end < start) return null;
  return { start, end };
}

async function listRows(userId: string) {
  const { rows } = await pool.query(
    `SELECT page_number, status, tested_by FROM public.tikrar_prior_hafalan WHERE user_id = $1 ORDER BY page_number`,
    [userId]
  );
  return rows.map((r) => ({ page: Number(r.page_number), status: r.status, testedBy: r.tested_by || null }));
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
    }
    return NextResponse.json({ data: await listRows(ctx.userId), error: null });
  } catch (err: any) {
    console.error('[TIKRAR_PRIOR_GET_ERROR]:', err);
    return NextResponse.json({ error: { message: err?.message || 'Gagal memuat hafalan lama.' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
    }
    const body = await req.json();
    const range = parseRange(body);
    const status = body?.status === 'tested_external' ? 'tested_external' : body?.status === 'untested' ? 'untested' : null;
    if (!range || !status) {
      return NextResponse.json(
        { error: { message: 'Pilih rentang halaman (1–604) dan status hafalan.' } },
        { status: 400 }
      );
    }
    const testedBy =
      status === 'tested_external' && typeof body.tested_by === 'string' && body.tested_by.trim()
        ? body.tested_by.trim().slice(0, 120)
        : null;

    await pool.query(
      `INSERT INTO public.tikrar_prior_hafalan (user_id, page_number, status, tested_by, updated_at)
       SELECT $1, p, $4, $5, now() FROM generate_series($2::int, $3::int) AS p
       ON CONFLICT (user_id, page_number) DO UPDATE SET
         status = EXCLUDED.status,
         tested_by = EXCLUDED.tested_by,
         updated_at = now()`,
      [ctx.userId, range.start, range.end, status, testedBy]
    );
    return NextResponse.json({ data: await listRows(ctx.userId), error: null });
  } catch (err: any) {
    console.error('[TIKRAR_PRIOR_POST_ERROR]:', err);
    return NextResponse.json({ error: { message: err?.message || 'Gagal menyimpan hafalan lama.' } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
    }
    const range = parseRange(await req.json().catch(() => ({})));
    if (!range) {
      return NextResponse.json({ error: { message: 'Pilih rentang halaman yang akan dihapus.' } }, { status: 400 });
    }
    await pool.query(
      `DELETE FROM public.tikrar_prior_hafalan WHERE user_id = $1 AND page_number BETWEEN $2 AND $3`,
      [ctx.userId, range.start, range.end]
    );
    return NextResponse.json({ data: await listRows(ctx.userId), error: null });
  } catch (err: any) {
    console.error('[TIKRAR_PRIOR_DELETE_ERROR]:', err);
    return NextResponse.json({ error: { message: err?.message || 'Gagal menghapus hafalan lama.' } }, { status: 500 });
  }
}
