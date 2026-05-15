import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FONNTE_API_KEY = Deno.env.get("FONNTE_API_KEY")
const GOWA_URL = Deno.env.get("GOWA_URL")
const GOWA_API_KEY = Deno.env.get("GOWA_API_KEY")
const PROVIDER = Deno.env.get("WHATSAPP_PROVIDER") || "fonnte" // 'fonnte' or 'gowa'

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

// --- Safety constants (tune these) ---
const DAILY_CAP = 200;              // max sends per day across all users
const SLEEP_MS_BETWEEN_SENDS = 8000;// throttle to avoid WhatsApp rate-limit
const FONNTE_DELAY_PARAM = 5;       // server-side stagger seconds (Fonnte only)
const QUIET_START_WIB = 6;          // do not send before 06:00 WIB
const QUIET_END_WIB = 21;           // do not send after 21:00 WIB
const MAX_CONSECUTIVE_FAILURES = 3; // auto-block after this many failures

const SIGNATURE = "\n\n— Admin Hi AQLI";

// Template variants (rotate to reduce spam-pattern detection)
// Each category has 3 variants: pantun, hadis/quote, ringan/santai
const TEMPLATES: Record<string, string[]> = {
  harian: [
    // Pantun
    "Assalamu'alaikum {salutation} {name} 🌸\n\nBeli santan di pasar Senin,\nDisimpan rapi dalam botol kaca,\nYuk {salutation}, semangat rutin,\nSetor Mufradat hari ini, bismillah saja! ✨",
    // Hadis/quote
    "Assalamu'alaikum {salutation} {name} 🌷\n\n\"Amalan yang paling dicintai Allah adalah yang paling istiqomah, walau sedikit.\" (HR. Bukhari)\n\nHari ini belum ada setoran nih. Yuk luangkan 5 menit untuk kuis Mufradat sebelum maghrib 💛",
    // Islamic / Pantun 2
    "Assalamu'alaikum {salutation} {name} 🌸\n\nMenanam bunga di dalam taman,\nBunga mekar indah berseri,\nMari kumpulkan amal di tangan,\nSetor Mufradat hari ini. ✨\n\nSemangat ya {salutation}, bismillah! 📖",
  ],
  weekend: [
    // Pantun
    "Assalamu'alaikum {salutation} {name} 🌺\n\nKapal layar berlayar ke utara,\nSinggah sebentar di pelabuhan,\nAkhir pekan ini ayo segera,\nTutup target dengan kemenangan! 🎯",
    // Quote
    "Assalamu'alaikum {salutation} {name} 🌷\n\nSudah Ahad sore nih, target weekend {salutation} belum tercapai. Tinggal sedikit lagi sebelum Senin datang.\n\n\"Sebaik-baik amal adalah yang istiqomah.\" Yuk selesaikan, {salutation} pasti bisa! 💪",
    // Islamic / Pantun 2
    "Assalamu'alaikum {salutation} {name} 🌺\n\nKe bukit tinggi mencari bekal,\nBekal dibawa untuk di jalan,\nJangan biarkan target terbengkal,\nYuk tuntaskan hafalan pekanan! ✨\n\nin syaa Allah jadi pemberat timbangan kebaikan. 🤲",
  ],
  fleksibel: [
    // Pantun
    "Assalamu'alaikum {salutation} {name} 🌷\n\nDaun pandan harum baunya,\nDipotong kecil masuk ke nasi,\nPekan ini progress {salutation} tertera,\nBaru {progress} ayat, yuk lanjutkan lagi! ✨",
    // Quote
    "Assalamu'alaikum {salutation} {name} 🌸\n\nMengingatkan target pekanan ya. Baru tercapai {progress} ayat nih.\n\n\"Sesungguhnya bersama kesulitan ada kemudahan.\" (QS. Al-Insyirah: 6)\n\nSemangat menuntaskan, {salutation}! 💛",
    // Islamic / Pantun 2
    "Assalamu'alaikum {salutation} {name} 🌷\n\nBurung merpati hinggap di dahan,\nHinggap sebentar mencari makan,\nIngat janji kepada Tuhan,\nHafalan Quran jangan lupakan. ✨\n\nPekan ini baru {progress} ayat nih, yuk semangat genapkan targetnya! 📖",
  ],
  monday_spirit: [
    // Pantun
    "Assalamu'alaikum {salutation} {name} 🌅\n\nSenin pagi mentari bersinar,\nEmbun pagi menetes di daun,\nPekan baru semangat berbinar,\nMufradat lancar selama bertahun! ✨\n\nSelamat memulai pekan, semangat menjaga hafalan! 💛",
    // Hadis
    "Assalamu'alaikum {salutation} {name} 🌷\n\nSelamat Senin pagi! 🌟\n\n\"Sebaik-baik kalian adalah yang mempelajari Al-Qur'an dan mengajarkannya.\" (HR. Bukhari)\n\nSemoga Allah bukakan pintu kemudahan untuk {salutation} menjaga hafalan di pekan ini. Bismillah! ✨",
    // Islamic / Pantun 2
    "Assalamu'alaikum {salutation} {name} 🌅\n\nPohon jati tumbuh berjajar,\nTumbuh subur di tanah hulu,\nSenin pagi semangat belajar,\nMufradat jadi teman selalu. 📖✨\n\nSelamat beraktivitas kembali di pekan yang berkah ini! 🌸",
  ],
};

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Ambil nama panggilan: nama depan dari full_name, fallback ke username, fallback "Ukhti"
function getDisplayName(fullName: string | null, username: string | null): string {
  if (fullName && fullName.trim()) {
    return fullName.trim();
  }
  if (username && username.trim()) {
    return username.trim();
  }
  return "Ukhti";
}

function pickTemplate(category: string, name: string, progress: number, userSalutation?: string | null, dbTemplates: any[] = []): string {
  // Filter templates by category
  const variants = dbTemplates.filter(t => t.category === category);
  
  // Fallback if no templates found for category in DB
  if (variants.length === 0) {
    const fallbacks = TEMPLATES[category] || ["Assalamu'alaikum {salutation} {name}, semangat menjaga hafalan!"];
    const tpl = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    const salutation = userSalutation?.trim() || (name.toLowerCase().includes('ummu') ? '' : 'Ukhti');
    return tpl
      .replace(/\{salutation\}/g, salutation)
      .replace(/\{name\}/g, name)
      .replace(/\{progress\}/g, String(progress))
      .replace(/  +/g, ' ')
      .trim() + SIGNATURE;
  }

  const tpl = variants[Math.floor(Math.random() * variants.length)].content;
  
  // Use chosen salutation, fallback to logic if not set
  const salutation = userSalutation?.trim() || (name.toLowerCase().includes('ummu') ? '' : 'Ukhti');
  
  const finalMessage = tpl
    .replace(/\{salutation\}/g, salutation)
    .replace(/\{name\}/g, name)
    .replace(/\{progress\}/g, String(progress))
    .replace(/  +/g, ' '); // Collapse double spaces if salutation is empty
  
  return finalMessage.trim() + SIGNATURE;
}

// --- SENDING LOGIC ---
async function sendWhatsApp(target: string, msg: string) {
  if (PROVIDER === "gowa") {
    const url = GOWA_URL?.endsWith('/') ? GOWA_URL + 'send' : (GOWA_URL || '') + '/send';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GOWA_API_KEY || ''}`.trim() 
      },
      body: JSON.stringify({
        phone: target,
        message: msg
      }),
    });
    const resData = await response.json().catch(() => ({}));
    // Gowa typically returns { status: true, ... } or { code: 200, ... }
    const ok = resData.status === true || resData.code === 200 || resData.status === "success";
    return { ok, resData, status: response.status };
  } else {
    // Default Fonnte
    const params: any = {
      target: target,
      message: msg,
      delay: String(FONNTE_DELAY_PARAM),
      countryCode: '62',
    };
    
    // If target is a group ID (contains @g.us), Fonnte handles it automatically if passed as target
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': (FONNTE_API_KEY || '').trim() },
      body: new URLSearchParams(params),
    });
    const resData = await response.json().catch(() => ({}));
    const ok = !!resData.status;
    return { ok, resData, status: response.status };
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Returns hour 0-23 in WIB (Asia/Jakarta, UTC+7)
function wibHour(d: Date): number {
  return (d.getUTCHours() + 7) % 24;
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const body = await req.json().catch(() => ({}));
    const { userId, mode } = body;
    // mode: 'harian', 'weekend', 'fleksibel', 'monday_spirit', 'auto_block_pasif', 'motivation_broadcast'

    const isManualSingle = !!userId; // admin testing one user → relax some checks

    // --- Quiet hours check (skip when admin tests single user) ---
    const now = new Date();
    const hourWib = wibHour(now);
    if (!isManualSingle && (hourWib < QUIET_START_WIB || hourWib >= QUIET_END_WIB)) {
      return new Response(JSON.stringify({
        results: [],
        skipped_reason: `quiet_hours (current WIB hour: ${hourWib}, allowed ${QUIET_START_WIB}-${QUIET_END_WIB})`
      }), { headers: { "Content-Type": "application/json" } });
    }

    // --- Daily cap check (skip when admin tests single user) ---
    let remainingDailyCap = Infinity;
    if (!isManualSingle) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('whatsapp_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('created_at', todayStart.toISOString());
      remainingDailyCap = DAILY_CAP - (todayCount || 0);
      if (remainingDailyCap <= 0) {
        return new Response(JSON.stringify({
          results: [],
          skipped_reason: `daily_cap_reached (sent today: ${todayCount}, cap: ${DAILY_CAP})`
        }), { headers: { "Content-Type": "application/json" } });
      }
    }

    // --- MOTIVATION BROADCAST FLOW (GROUP) ---
    if (mode === 'motivation_broadcast') {
      // 1. Fetch one active motivation
      const { data: motivation } = await supabase
        .from('mufradat_motivations')
        .select('content')
        .eq('active', true)
        .order('last_sent_at', { ascending: true }) // rotate through them
        .limit(1)
        .maybeSingle();
      
      if (!motivation) {
        return new Response(JSON.stringify({ error: 'No active motivations found' }), { status: 400 });
      }

      // 2. Fetch groups with WhatsApp ID
      const { data: groups } = await supabase
        .from('mufradat_groups')
        .select('id, name, fonnte_group_id')
        .not('fonnte_group_id', 'is', null);
      
      if (!groups || groups.length === 0) {
        return new Response(JSON.stringify({ message: 'No groups linked with WhatsApp ID' }), { status: 200 });
      }

      const results: any[] = [];
      for (const group of groups) {
        const msg = motivation.content + SIGNATURE;
        
        // Skip sleep on first run
        if (results.length > 0) await sleep(SLEEP_MS_BETWEEN_SENDS);

        const { ok, resData, status: httpStatus } = await sendWhatsApp(group.fonnte_group_id, msg);
        
        results.push({ group: group.name, status: ok ? 'sent' : 'failed', target: group.fonnte_group_id, response: resData });

        // Update last_sent_at for the motivation if at least one sent
        if (ok) {
           await supabase.from('mufradat_motivations').update({ last_sent_at: new Date().toISOString() }).eq('content', motivation.content);
        }
      }

      return new Response(JSON.stringify({ success: true, results }), { headers: { "Content-Type": "application/json" } });
    }

    // 1. Get user(s) — hanya peserta resmi Hi Mufradat yang masih dalam masa berlaku
    let query = supabase
      .from('users')
      .select('id, full_name, username, salutation, whatsapp, phone, mufradat_target_verses, mufradat_status, mufradat_due_date, wa_failed_count, wa_blocked_at, updated_at');

    if (userId) {
      query = query.eq('id', userId);
    } else {
      query = query
        .eq('mufradat_status', 'active')
        .gte('mufradat_due_date', new Date().toISOString());
    }

    const { data: users, error: userError } = await query;
    if (userError) throw userError;

    // 2. Get schedule from halaqah_registrations.metadata
    const userIds = (users || []).map((u: any) => u.id);
    const { data: regs } = userIds.length > 0
      ? await supabase
          .from('halaqah_registrations')
          .select('user_id, metadata')
          .eq('status', 'verified')
          .in('user_id', userIds)
      : { data: [] };

    const scheduleByUser: Record<string, string> = {};
    for (const r of (regs || [])) {
      if (!scheduleByUser[r.user_id]) {
        scheduleByUser[r.user_id] = (r.metadata?.schedule as string) || 'fleksibel';
      }
    }

    // Filter by mode (schedule) when no specific userId
    let filteredUsers = users || [];
    if (!userId && ['harian', 'weekend', 'fleksibel'].includes(mode)) {
      filteredUsers = filteredUsers.filter((u: any) => (scheduleByUser[u.id] || 'fleksibel') === mode);
    }

    console.log(`REMINDER_ENGINE: Mode: ${mode || 'All'}. Target: ${filteredUsers.length} users. WIB hour: ${hourWib}. Remaining cap: ${remainingDailyCap}`);

    // Fetch all templates once for this run
    const { data: dbTemplates } = await supabase.from('mufradat_reminder_templates').select('*');
    const safeDbTemplates = dbTemplates || [];

    const today = now.getDay();
    const results: any[] = [];

    // Pre-fetch today's already-sent log for idempotency (one query, then in-memory check)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { data: sentToday } = await supabase
      .from('whatsapp_logs')
      .select('user_id, type')
      .eq('status', 'sent')
      .gte('created_at', todayStart.toISOString());
    const sentTodaySet = new Set((sentToday || []).map((l: any) => `${l.user_id}|${l.type}`));

    let sentThisRun = 0;

    for (const user of filteredUsers) {
      const schedule = scheduleByUser[user.id] || 'fleksibel';
      let message = "";
      const type = mode || `reminder_${schedule}`;

      // --- AUTO BLOCK 3 MONTHS PASIF (separate flow) ---
      if (mode === 'auto_block_pasif') {
        const { data: lastQuiz } = await supabase
          .from('quiz_attempts')
          .select('created_at')
          .eq('user_id', user.id)
          .eq('is_passed', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastDate = lastQuiz ? new Date(lastQuiz.created_at) : new Date(user.updated_at);
        const diffMonths = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

        if (diffMonths >= 3) {
          await supabase.from('users').update({ mufradat_status: 'blocked' }).eq('id', user.id);
          results.push({ user: user.full_name, status: 'blocked_passive' });
          continue;
        }
        results.push({ user: user.full_name, status: 'checked_active' });
        continue;
      }

      // --- Per-user safety pre-checks ---
      if (user.wa_blocked_at) {
        results.push({ user: user.full_name, status: 'skipped_auto_blocked' });
        continue;
      }
      if (!isManualSingle && sentTodaySet.has(`${user.id}|${type}`)) {
        results.push({ user: user.full_name, status: 'skipped_already_sent_today' });
        continue;
      }
      if (!isManualSingle && sentThisRun >= remainingDailyCap) {
        results.push({ user: user.full_name, status: 'skipped_daily_cap' });
        continue;
      }

      // --- MONDAY SPIRIT BROADCAST ---
      if (mode === 'monday_spirit') {
        if (today !== 1 && !userId) continue; // Run only on Monday
        const dn = getDisplayName(user.full_name, user.username);
        message = pickTemplate('monday_spirit', dn, 0, user.salutation, safeDbTemplates);
      }
      // --- REGULAR REMINDERS ---
      else {
        let lookbackDays = 7;
        let checkProgress = false;

        if (schedule === 'harian' && today >= 1 && today <= 5) {
          lookbackDays = 1;
          checkProgress = true;
        } else if ((schedule === 'weekend' || schedule === 'pekanan') && today === 0) {
          lookbackDays = 2;
          checkProgress = true;
        } else if (schedule === 'fleksibel' && today === 0) {
          lookbackDays = 7;
          checkProgress = true;
        }

        if (userId) checkProgress = true;
        if (!checkProgress) continue;

        const startTime = new Date();
        startTime.setDate(startTime.getDate() - lookbackDays);
        startTime.setHours(0, 0, 0, 0);

        const { count } = await supabase
          .from('quiz_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_passed', true)
          .gte('created_at', startTime.toISOString());

        const actualProgress = count || 0;
        const target = user.mufradat_target_verses || 15;

        if (actualProgress < target || userId) {
          const dn = getDisplayName(user.full_name, user.username);
          const tplKey = schedule === 'harian' ? 'harian' : (schedule === 'weekend' || schedule === 'pekanan') ? 'weekend' : 'pekanan';
          message = pickTemplate(tplKey, dn, actualProgress, user.salutation, safeDbTemplates);
        }
      }

      if (!message) continue;

      const waSource = user.whatsapp || user.phone;
      if (!waSource) {
        results.push({ user: user.full_name, status: 'skipped_no_contact' });
        continue;
      }

      let cleanNumber = waSource.replace(/[^0-9]/g, '');
      if (cleanNumber.startsWith('0')) cleanNumber = '62' + cleanNumber.substring(1);
      if (!/^628\d{8,12}$/.test(cleanNumber)) {
        results.push({ user: user.full_name, status: 'skipped_invalid_number', whatsapp: cleanNumber });
        continue;
      }

      // Throttle between sends (skip sleep on the very first one)
      if (sentThisRun > 0) {
        await sleep(SLEEP_MS_BETWEEN_SENDS);
      }


      const { ok, resData, status: httpStatus } = await sendWhatsApp(cleanNumber, message);

      await supabase.from('whatsapp_logs').insert({
        user_id: user.id,
        recipient: cleanNumber,
        message: message,
        status: ok ? 'sent' : 'failed',
        type: type,
        metadata: { 
          provider: PROVIDER,
          response: resData, 
          http_status: httpStatus 
        },
      });

      if (ok) {
        sentThisRun++;
        sentTodaySet.add(`${user.id}|${type}`);
        // Reset failure counter on success
        if ((user.wa_failed_count || 0) > 0) {
          await supabase.from('users').update({ wa_failed_count: 0 }).eq('id', user.id);
        }
        results.push({ user: user.full_name, whatsapp: cleanNumber, status: 'sent' });
      } else {
        const newFailCount = (user.wa_failed_count || 0) + 1;
        const updatePayload: any = { wa_failed_count: newFailCount };
        if (newFailCount >= MAX_CONSECUTIVE_FAILURES) {
          updatePayload.wa_blocked_at = new Date().toISOString();
        }
        await supabase.from('users').update(updatePayload).eq('id', user.id);
        results.push({
          user: user.full_name,
          whatsapp: cleanNumber,
          status: 'failed',
          reason: resData.reason || resData.message || 'unknown',
          fail_count: newFailCount,
          auto_blocked: newFailCount >= MAX_CONSECUTIVE_FAILURES,
        });
      }
    }

    return new Response(JSON.stringify({
      results,
      summary: {
        total: results.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => typeof r.status === 'string' && r.status.startsWith('skipped')).length,
      }
    }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
})
