import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { isStaff } from '@/lib/db-policy';
import { whatsappService, normalizePhoneNumber } from '@/lib/services/whatsapp';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }
    if (!isStaff(ctx)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    // 1. Fetch halaqahs (Tikrar, Ngaji, etc.) with dynamic member count & whatsapp config mapping
    const { rows: halaqahRows } = await query(`
      SELECT 
        h.id,
        h.title as name,
        h.program_type,
        h.whatsapp_group_link,
        COALESCE(hwc.whatsapp_group_id, '') as whatsapp_group_id,
        h.musyrifah,
        h.schedule,
        h.zoom_link,
        COUNT(DISTINCT u.id)::int as member_count
      FROM public.halaqahs h
      LEFT JOIN public.halaqah_whatsapp_configs hwc ON hwc.halaqah_id = h.id
      LEFT JOIN public.users u ON (
        u.tikrar_halaqah_id = h.id 
        OR (u.followed_halaqahs IS NOT NULL AND u.followed_halaqahs::jsonb @> to_jsonb(h.id::text))
      )
      GROUP BY h.id, hwc.whatsapp_group_id
      ORDER BY 
        CASE 
          WHEN h.program_type = 'tikrar_daily' THEN 1
          WHEN h.program_type = 'hi_mufradat' THEN 2
          ELSE 3
        END,
        h.title ASC
    `);

    // 2. Fetch mufradat_groups with dynamic member count
    const { rows: mufradatRows } = await query(`
      SELECT 
        mg.id,
        mg.name,
        'hi_mufradat' as program_type,
        mg.whatsapp_link as whatsapp_group_link,
        COALESCE(mg.fonnte_group_id, '') as whatsapp_group_id,
        mg.musyrifah_name as musyrifah,
        'Harian' as schedule,
        COUNT(DISTINCT u.id)::int as member_count
      FROM public.mufradat_groups mg
      LEFT JOIN public.users u ON u.mufradat_group_id = mg.id
      GROUP BY mg.id
      ORDER BY mg.name ASC
    `);

    // Merge and categorize
    const normalizedGroups = [
      ...halaqahRows.map((h: any) => ({
        id: h.id,
        name: h.name,
        program_type: h.program_type,
        program_category: h.program_type === 'tikrar_daily' ? 'tikrar' : (h.program_type === 'hi_mufradat' ? 'mufradat' : 'ngaji'),
        whatsapp_group_link: h.whatsapp_group_link,
        whatsapp_group_id: h.whatsapp_group_id || null,
        musyrifah: h.musyrifah,
        schedule: h.schedule,
        zoom_link: h.zoom_link,
        member_count: Number(h.member_count) || 0,
        source_table: 'halaqahs'
      })),
      ...mufradatRows.map((m: any) => ({
        id: m.id,
        name: m.name,
        program_type: 'hi_mufradat',
        program_category: 'mufradat',
        whatsapp_group_link: m.whatsapp_group_link,
        whatsapp_group_id: m.whatsapp_group_id || null,
        musyrifah: m.musyrifah,
        schedule: m.schedule,
        zoom_link: null,
        member_count: Number(m.member_count) || 0,
        source_table: 'mufradat_groups'
      }))
    ];

    // 3. Fetch WatZap Status & Groups
    const watzapStatus = await whatsappService.getStatus();
    let watzapGroups: any[] = [];
    try {
      watzapGroups = await whatsappService.getGroups();
    } catch (e) {
      console.warn('[API /admin/groups] Failed to fetch watzap groups:', e);
    }

    // 4. Fetch recent 40 logs from whatsapp_logs
    const { rows: recentLogs } = await query(`
      SELECT 
        id,
        user_id,
        recipient,
        message,
        status,
        type,
        metadata,
        created_at
      FROM public.whatsapp_logs
      ORDER BY created_at DESC
      LIMIT 40
    `);

    return NextResponse.json({
      success: true,
      groups: normalizedGroups,
      watzap_status: watzapStatus,
      watzap_groups: watzapGroups,
      recent_logs: recentLogs
    });
  } catch (error: any) {
    console.error('[API /admin/groups GET error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
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
    const action = typeof body?.action === 'string' ? body.action : '';

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action wajib disertakan.' }, { status: 400 });
    }

    // ACTION: get_members
    if (action === 'get_members') {
      const { groupId, sourceTable } = body;
      if (!groupId) {
        return NextResponse.json({ success: false, error: 'Group ID wajib disertakan.' }, { status: 400 });
      }

      let members: any[] = [];
      if (sourceTable === 'mufradat_groups') {
        const { rows } = await query(`
          SELECT 
            id, 
            username, 
            full_name, 
            phone, 
            whatsapp, 
            created_at,
            tikrar_current_page,
            is_tikrar_paid
          FROM public.users
          WHERE mufradat_group_id = $1
             OR (followed_halaqahs IS NOT NULL AND followed_halaqahs::jsonb @> to_jsonb($1::text))
          ORDER BY full_name ASC, username ASC
        `, [groupId]);
        members = rows;
      } else {
        const { rows } = await query(`
          SELECT 
            id, 
            username, 
            full_name, 
            phone, 
            whatsapp, 
            created_at,
            tikrar_current_page,
            is_tikrar_paid
          FROM public.users
          WHERE tikrar_halaqah_id = $1
             OR (followed_halaqahs IS NOT NULL AND followed_halaqahs::jsonb @> to_jsonb($1::text))
          ORDER BY full_name ASC, username ASC
        `, [groupId]);
        members = rows;
      }

      return NextResponse.json({ success: true, members });
    }

    // ACTION: send_group_message
    if (action === 'send_group_message') {
      const { groupId, groupTitle, programType, message, watzapGroupId } = body;
      if (!message || !message.trim()) {
        return NextResponse.json({ success: false, error: 'Pesan broadcast tidak boleh kosong.' }, { status: 400 });
      }

      const targetGroupId = watzapGroupId?.trim();
      if (!targetGroupId) {
        return NextResponse.json({
          success: false,
          error: 'Group ID WhatsApp (WatZap) belum dikonfigurasi untuk grup ini. Silakan atur Group ID terlebih dahulu.'
        }, { status: 400 });
      }

      const sendRes = await whatsappService.sendGroupMessage(targetGroupId, message);

      // Record to whatsapp_logs
      const logId = crypto.randomUUID();
      const logStatus = sendRes.success ? 'sent' : 'failed';
      const logType = programType === 'tikrar_daily' ? 'broadcast_tikrar' : (programType === 'hi_mufradat' ? 'broadcast_mufradat' : 'broadcast_group');

      try {
        await query(`
          INSERT INTO public.whatsapp_logs (
            id,
            user_id,
            recipient,
            message,
            status,
            type,
            metadata,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
        `, [
          logId,
          ctx.userId,
          groupTitle || targetGroupId,
          message,
          logStatus,
          logType,
          JSON.stringify({
            group_id: groupId,
            watzap_group_id: targetGroupId,
            program_type: programType,
            provider: sendRes.provider,
            error: sendRes.error || null,
            details: sendRes.details || null
          })
        ]);
      } catch (logErr) {
        console.warn('[API /admin/groups] Failed to save whatsapp_logs:', logErr);
      }

      if (!sendRes.success) {
        return NextResponse.json({
          success: false,
          error: sendRes.error || 'Gagal mengirim pesan ke grup WhatsApp.'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Pesan berhasil dikirim ke grup WhatsApp!',
        messageId: sendRes.messageId
      });
    }

    // ACTION: send_direct_message
    if (action === 'send_direct_message') {
      const { userId, phone, message, recipientName } = body;
      if (!message || !message.trim()) {
        return NextResponse.json({ success: false, error: 'Pesan tidak boleh kosong.' }, { status: 400 });
      }

      const targetPhone = normalizePhoneNumber(phone || '');
      if (!targetPhone) {
        return NextResponse.json({ success: false, error: 'Nomor WhatsApp penerima tidak valid.' }, { status: 400 });
      }

      const sendRes = await whatsappService.sendTextMessage(targetPhone, message);

      // Record to whatsapp_logs
      const logId = crypto.randomUUID();
      const logStatus = sendRes.success ? 'sent' : 'failed';

      try {
        await query(`
          INSERT INTO public.whatsapp_logs (
            id,
            user_id,
            recipient,
            message,
            status,
            type,
            metadata,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
        `, [
          logId,
          ctx.userId,
          targetPhone,
          message,
          logStatus,
          'japri_peserta',
          JSON.stringify({
            target_user_id: userId || null,
            recipient_name: recipientName || null,
            provider: sendRes.provider,
            error: sendRes.error || null
          })
        ]);
      } catch (logErr) {
        console.warn('[API /admin/groups] Failed to save whatsapp_logs for direct message:', logErr);
      }

      if (!sendRes.success) {
        return NextResponse.json({
          success: false,
          error: sendRes.error || 'Gagal mengirim pesan WhatsApp.'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Pesan WhatsApp berhasil dikirim ke penerima!',
        messageId: sendRes.messageId
      });
    }

    // ACTION: update_group
    if (action === 'update_group') {
      const { id, sourceTable, whatsapp_group_link, whatsapp_group_id, musyrifah, schedule, name, zoom_link } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'ID grup wajib disertakan.' }, { status: 400 });
      }

      if (sourceTable === 'mufradat_groups') {
        await query(`
          UPDATE public.mufradat_groups
          SET 
            name = COALESCE($1, name),
            whatsapp_link = $2,
            fonnte_group_id = $3,
            musyrifah_name = $4
          WHERE id = $5
        `, [name || null, whatsapp_group_link || null, whatsapp_group_id || null, musyrifah || null, id]);
      } else {
        await query(`
          UPDATE public.halaqahs
          SET 
            title = COALESCE($1, title),
            whatsapp_group_link = $2,
            musyrifah = $3,
            schedule = COALESCE($4, schedule),
            zoom_link = CASE WHEN $5::text IS NOT NULL THEN $5::text ELSE zoom_link END
          WHERE id = $6
        `, [name || null, whatsapp_group_link || null, musyrifah || null, schedule || null, zoom_link !== undefined ? zoom_link : null, id]);

        if (whatsapp_group_id !== undefined) {
          await query(`
            INSERT INTO public.halaqah_whatsapp_configs (halaqah_id, whatsapp_group_id, updated_at)
            VALUES ($1, $2, now())
            ON CONFLICT (halaqah_id) DO UPDATE SET whatsapp_group_id = EXCLUDED.whatsapp_group_id, updated_at = now()
          `, [id, whatsapp_group_id || null]);
        }
      }

      return NextResponse.json({ success: true, message: 'Data grup berhasil diperbarui!' });
    }

    // ACTION: fetch_logs
    if (action === 'fetch_logs') {
      const { filterType, filterStatus, searchQuery, limit = 50 } = body;
      let queryStr = `
        SELECT 
          id,
          user_id,
          recipient,
          message,
          status,
          type,
          metadata,
          created_at
        FROM public.whatsapp_logs
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filterType && filterType !== 'all') {
        params.push(filterType);
        queryStr += ` AND type = $${params.length}`;
      }

      if (filterStatus && filterStatus !== 'all') {
        params.push(filterStatus);
        queryStr += ` AND status = $${params.length}`;
      }

      if (searchQuery && searchQuery.trim()) {
        params.push(`%${searchQuery.trim()}%`);
        queryStr += ` AND (recipient ILIKE $${params.length} OR message ILIKE $${params.length})`;
      }

      queryStr += ` ORDER BY created_at DESC LIMIT ${Math.min(Number(limit) || 50, 100)}`;

      const { rows } = await query(queryStr, params);
      return NextResponse.json({ success: true, logs: rows });
    }

    return NextResponse.json({ success: false, error: `Action ${action} tidak dikenali.` }, { status: 400 });
  } catch (error: any) {
    console.error('[API /admin/groups POST error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
