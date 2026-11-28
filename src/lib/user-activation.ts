import crypto from 'crypto';
import type { PoolClient } from 'pg';

export const MUFRADAT_GROUP_CAPACITY = 50;
export const ALL_JUZ_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);

export interface AssignedGroupInfo {
  id: string;
  name: string;
  whatsapp_link: string | null;
}

/**
 * Assigns a Mufradat group with fewer than MUFRADAT_GROUP_CAPACITY members
 * (filling oldest open group first), or creates the next numbered group (`Grup N`).
 * Must be called inside an active DB transaction.
 */
export async function assignMufradatGroup(client: PoolClient): Promise<AssignedGroupInfo> {
  const { rows: groupRows } = await client.query<{ id: string; name: string; whatsapp_link: string | null }>(
    `SELECT id, name, whatsapp_link
       FROM public.mufradat_groups
      WHERE COALESCE(member_count, 0) < $1
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE`,
    [MUFRADAT_GROUP_CAPACITY]
  );

  const existing = groupRows[0];
  if (existing) {
    await client.query(
      `UPDATE public.mufradat_groups SET member_count = COALESCE(member_count, 0) + 1 WHERE id = $1`,
      [existing.id]
    );
    return existing;
  }

  const { rows: countRows } = await client.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM public.mufradat_groups`
  );
  const newId = crypto.randomUUID();
  const newName = `Grup ${(countRows[0]?.n || 0) + 1}`;
  await client.query(
    `INSERT INTO public.mufradat_groups (id, name, member_count, created_at)
     VALUES ($1, $2, 1, now())`,
    [newId, newName]
  );
  return { id: newId, name: newName, whatsapp_link: null };
}

/**
 * Fetches default free core halaqah IDs (Hi Mufradat & Hi Tikrar) from public.halaqahs.
 */
export async function getCoreHalaqahIds(client: PoolClient): Promise<string[]> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM public.halaqahs WHERE program_type IN ('hi_mufradat', 'tikrar_daily')`
  );
  return rows.map((r) => r.id);
}

/**
 * Activates a single non-blacklisted user for all free Hi AQLI programs:
 * - Hi Mufradat active + assigned group (<= 50 capacity) + all 30 juz
 * - Hi Tikrar active (`is_tikrar_paid = true`, `"paidJuz" = COALESCE("paidJuz", 30)`)
 * - Core `followed_halaqahs` merged
 * - Optional promotion of pending initial registrations
 */
export async function activateUserPrograms(
  client: PoolClient,
  userId: string,
  options: { promotePending?: boolean } = {}
): Promise<{ group: AssignedGroupInfo | null } | null> {
  const { rows: userRows } = await client.query<{
    id: string;
    is_blacklisted: boolean | null;
    mufradat_group_id: string | null;
    followed_halaqahs: any;
    mufradat_accessible_juz: any;
    is_tikrar_paid: boolean | null;
    paidJuz: number | null;
  }>(
    `SELECT id, is_blacklisted, mufradat_group_id, followed_halaqahs, mufradat_accessible_juz, is_tikrar_paid, "paidJuz"
       FROM public.users
      WHERE id = $1
      FOR UPDATE`,
    [userId]
  );

  const user = userRows[0];
  if (!user || user.is_blacklisted) return null;

  let groupInfo: AssignedGroupInfo | null = null;
  let targetGroupId = user.mufradat_group_id;

  if (!targetGroupId) {
    groupInfo = await assignMufradatGroup(client);
    targetGroupId = groupInfo.id;
  } else {
    const { rows: gRows } = await client.query<AssignedGroupInfo>(
      `SELECT id, name, whatsapp_link FROM public.mufradat_groups WHERE id = $1 LIMIT 1`,
      [targetGroupId]
    );
    groupInfo = gRows[0] || null;
  }

  const coreIds = await getCoreHalaqahIds(client);
  const currentFollowed: string[] = Array.isArray(user.followed_halaqahs) ? user.followed_halaqahs : [];
  const mergedFollowed = Array.from(new Set([...currentFollowed, ...coreIds]));

  const currentJuz: number[] = Array.isArray(user.mufradat_accessible_juz) ? user.mufradat_accessible_juz : [];
  const mergedJuz = Array.from(new Set([...currentJuz, ...ALL_JUZ_NUMBERS])).sort((a, b) => a - b);

  await client.query(
    `UPDATE public.users
        SET mufradat_status = 'active',
            mufradat_group_id = $2,
            mufradat_accessible_juz = $3::jsonb,
            is_tikrar_paid = true,
            "paidJuz" = COALESCE("paidJuz", 30),
            tikrar_start_date = COALESCE(tikrar_start_date, now()),
            followed_halaqahs = $4::jsonb,
            updated_at = now()
      WHERE id = $1`,
    [userId, targetGroupId, JSON.stringify(mergedJuz), JSON.stringify(mergedFollowed)]
  );

  if (options.promotePending) {
    await client.query(
      `UPDATE public.halaqah_registrations
          SET status = 'verified',
              verified_at = COALESCE(verified_at, now()),
              start_date = COALESCE(start_date, now()),
              updated_at = now(),
              metadata = COALESCE(metadata, '{}'::jsonb) || '{"promoted_free": true}'::jsonb
        WHERE user_id = $1
          AND status = 'pending_verification'
          AND (payment_type IS NULL OR payment_type = 'initial')`,
      [userId]
    );
  }

  return { group: groupInfo };
}

/**
 * Bulk-activates all non-blacklisted users inside an active transaction:
 * - Syncs existing mufradat_groups.member_count from actual users
 * - Assigns ungrouped non-blacklisted users to open groups (<= 50 capacity) or new groups
 * - Activates mufradat_status, mufradat_accessible_juz (1..30), is_tikrar_paid, "paidJuz", followed_halaqahs
 * - Promotes any pending initial registrations to 'verified'
 * - Re-syncs mufradat_groups.member_count accurately
 */
export async function activateAllUsers(client: PoolClient): Promise<{ activatedCount: number; createdGroups: string[] }> {
  // 1. Sync member_count first from actual users
  await client.query(`
    UPDATE public.mufradat_groups mg
       SET member_count = sub.cnt
      FROM (
        SELECT mg2.id, COUNT(u.id)::int AS cnt
          FROM public.mufradat_groups mg2
          LEFT JOIN public.users u ON u.mufradat_group_id = mg2.id
         GROUP BY mg2.id
      ) sub
     WHERE mg.id = sub.id
  `);

  // 2. Find non-blacklisted users without a Mufradat group and assign cleanly
  const { rows: ungrouped } = await client.query<{ id: string }>(
    `SELECT id FROM public.users
      WHERE COALESCE(is_blacklisted, false) = false
        AND mufradat_group_id IS NULL
      ORDER BY created_at ASC`
  );

  const createdGroups: string[] = [];
  const { rows: beforeGroups } = await client.query<{ id: string }>(`SELECT id FROM public.mufradat_groups`);
  const existingGroupIds = new Set(beforeGroups.map((g) => g.id));

  for (const u of ungrouped) {
    const grp = await assignMufradatGroup(client);
    if (!existingGroupIds.has(grp.id)) {
      existingGroupIds.add(grp.id);
      createdGroups.push(grp.name);
    }
    await client.query(
      `UPDATE public.users SET mufradat_group_id = $2 WHERE id = $1`,
      [u.id, grp.id]
    );
  }

  // 3. Activate all non-blacklisted users
  const { rows: targets } = await client.query<{ id: string }>(
    `SELECT id FROM public.users WHERE COALESCE(is_blacklisted, false) = false`
  );

  for (const t of targets) {
    await activateUserPrograms(client, t.id, { promotePending: true });
  }

  // 4. Final sync of member_count
  await client.query(`
    UPDATE public.mufradat_groups mg
       SET member_count = sub.cnt
      FROM (
        SELECT mg2.id, COUNT(u.id)::int AS cnt
          FROM public.mufradat_groups mg2
          LEFT JOIN public.users u ON u.mufradat_group_id = mg2.id
         GROUP BY mg2.id
      ) sub
     WHERE mg.id = sub.id
  `);

  return { activatedCount: targets.length, createdGroups };
}
