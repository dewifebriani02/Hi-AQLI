import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get('page');

    if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
        return NextResponse.json({ success: false, error: 'Halaman tidak valid (1-604).' }, { status: 400 });
      }

      const { rows } = await query(
        `SELECT page_number, blocks, notes, updated_at
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

    // Ambil semua halaman yang memiliki konfigurasi kustom (untuk caching / prefetching di client)
    const { rows } = await query(
      `SELECT page_number, blocks, notes, updated_at
       FROM public.tikrar_page_block_configs
       ORDER BY page_number ASC`
    );

    return NextResponse.json({
      success: true,
      configs: rows,
    });
  } catch (err: any) {
    console.error('[TIKRAR_BLOCKS_GET_ERROR]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat konfigurasi blok.' },
      { status: 500 }
    );
  }
}
