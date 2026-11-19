import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { PageBlockConfig } from '@/lib/tikrar-blocks';

function isStaff(ctx: { isAdmin: boolean; isSuperAdmin: boolean; isMusyrifah: boolean }): boolean {
  return ctx.isAdmin || ctx.isSuperAdmin || ctx.isMusyrifah;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }
    if (!isStaff(ctx)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get('page');

    if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
        return NextResponse.json({ success: false, error: 'Halaman tidak valid (1-604).' }, { status: 400 });
      }

      const { rows } = await query(
        `SELECT page_number, blocks, notes, created_at, updated_at
         FROM public.tikrar_page_block_configs
         WHERE page_number = $1`,
        [pageNum]
      );

      if (rows.length === 0) {
        return NextResponse.json({
          success: true,
          page_number: pageNum,
          config: null,
          isCustom: false,
        });
      }

      return NextResponse.json({
        success: true,
        page_number: pageNum,
        config: rows[0].blocks,
        notes: rows[0].notes,
        isCustom: true,
        updatedAt: rows[0].updated_at,
      });
    }

    // List all configured pages
    const { rows } = await query(
      `SELECT page_number, notes, updated_at
       FROM public.tikrar_page_block_configs
       ORDER BY page_number ASC`
    );

    return NextResponse.json({
      success: true,
      pages: rows,
    });
  } catch (err: any) {
    console.error('[ADMIN_TIKRAR_BLOCKS_GET_ERROR]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }
    if (!isStaff(ctx)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await req.json();
    const pageNum = parseInt(body.page_number, 10);
    const blocks = body.blocks as PageBlockConfig;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : null;

    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
      return NextResponse.json({ success: false, error: 'Halaman harus antara 1 sampai 604.' }, { status: 400 });
    }

    if (!blocks || !blocks[1] || !blocks[2] || !blocks[3] || !blocks[4]) {
      return NextResponse.json(
        { success: false, error: 'Struktur blok harus memiliki 4 blok lengkap (TM1, TM2, TM3, TM4).' },
        { status: 400 }
      );
    }

    // Validasi setiap blok memiliki sub_1 dan sub_2
    for (const bId of [1, 2, 3, 4] as const) {
      const b = blocks[bId];
      if (!b.sub_1 || !b.sub_2) {
        return NextResponse.json(
          { success: false, error: `Blok ${bId} harus memiliki sub-blok sub_1 dan sub_2.` },
          { status: 400 }
        );
      }
      if (!b.sub_1.start_verse_key || !b.sub_1.end_verse_key || !b.sub_2.start_verse_key || !b.sub_2.end_verse_key) {
        return NextResponse.json(
          { success: false, error: `Rentang ayat pada Blok ${bId} belum lengkap.` },
          { status: 400 }
        );
      }
    }

    const { rows } = await query(
      `INSERT INTO public.tikrar_page_block_configs (page_number, blocks, notes, created_by, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $4, now())
       ON CONFLICT (page_number) DO UPDATE SET
         blocks = EXCLUDED.blocks,
         notes = EXCLUDED.notes,
         updated_by = EXCLUDED.updated_by,
         updated_at = now()
       RETURNING page_number, blocks, notes, updated_at`,
      [pageNum, JSON.stringify(blocks), notes, ctx.userId]
    );

    return NextResponse.json({
      success: true,
      message: `Konfigurasi blok untuk Halaman ${pageNum} berhasil disimpan.`,
      data: rows[0],
    });
  } catch (err: any) {
    console.error('[ADMIN_TIKRAR_BLOCKS_POST_ERROR]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan konfigurasi blok.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }
    if (!isStaff(ctx)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get('page');
    if (!pageParam) {
      return NextResponse.json({ success: false, error: 'Parameter page diperlukan.' }, { status: 400 });
    }

    const pageNum = parseInt(pageParam, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
      return NextResponse.json({ success: false, error: 'Halaman tidak valid.' }, { status: 400 });
    }

    await query(`DELETE FROM public.tikrar_page_block_configs WHERE page_number = $1`, [pageNum]);

    return NextResponse.json({
      success: true,
      message: `Konfigurasi Halaman ${pageNum} berhasil dihapus (kembali ke default).`,
    });
  } catch (err: any) {
    console.error('[ADMIN_TIKRAR_BLOCKS_DELETE_ERROR]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus konfigurasi blok.' },
      { status: 500 }
    );
  }
}
