import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthContext, type AuthContext } from '@/lib/auth-server';
import {
  checkRead,
  checkWrite,
  isStaff,
  redactUserRow,
  sanitizeOwnedRecord,
  PolicyError,
} from '@/lib/db-policy';
import { v4 as uuidv4 } from 'uuid';

// Whitelist of valid public tables to prevent arbitrary SQL injection
const ALLOWED_TABLES = new Set([
  'users',
  'mufradat_groups',
  'halaqahs',
  'halaqah_registrations',
  'mutabaah_logs',
  'quiz_attempts',
  'best_quiz_attempts',
  'user_badges',
  'donations',
  'campaigns',
  'vouchers',
  'voucher_redemptions',
  'whatsapp_logs',
  'mufradat_reactions',
  'mufradat_motivations',
  'mufradat_mabar_sessions',
  'mufradat_mabar_participants',
  'mufradat_payouts',
  'roles_admin',
  'roles_musyrifah',
  'roles_superadmin',
  'page_exams',
  'matans',
  'matan_chapters',
  'matan_items',
  'matan_user_progress',
  'mufradat_reminder_templates',
  'mufradat_reminder_configs',
  'tikrar_daily_logs',
  'tikrar_submissions',
  'tikrar_groups',
]);

// Tables whose primary key is not a single generated `id` UUID column
const NON_UUID_PK_TABLES = new Set([
  'mufradat_reminder_configs',
  'mufradat_mabar_participants',
]);

class BadRequest extends Error {}

function mapColumnName(table: string | undefined, col: string): string {
  if (table === 'users' && col === 'paid_juz') return 'paidJuz';
  if (table === 'page_exams' && col === 'page') return 'page_number';
  if (table === 'matan_chapters' && col === 'order_index') return 'chapter_number';
  if (table === 'matan_items') {
    if (col === 'order_index') return 'item_number';
    if (col === 'bait_arabic') return 'arabic';
  }
  if (table === 'matan_user_progress' && col === 'status_paham') return 'memorized';
  return col;
}

function normalizeTablePayload(table: string, record: Record<string, any>): Record<string, any> {
  const out = { ...record };
  if (table === 'users') {
    if ('paid_juz' in out && !('paidJuz' in out)) {
      out.paidJuz = out.paid_juz;
    }
    delete out.paid_juz;
  } else if (table === 'page_exams') {
    if ('page' in out && !('page_number' in out)) {
      out.page_number = out.page;
    }
    delete out.page;
    delete out.user_name;
    delete out.juz;
    delete out.status;
    delete out.requested_at;
  } else if (table === 'matan_chapters') {
    if ('order_index' in out && !('chapter_number' in out)) {
      out.chapter_number = out.order_index;
    }
    delete out.order_index;
  } else if (table === 'matan_items') {
    if ('order_index' in out && !('item_number' in out)) {
      out.item_number = out.order_index;
    }
    if ('bait_arabic' in out && !('arabic' in out)) {
      out.arabic = out.bait_arabic;
    }
    delete out.order_index;
    delete out.bait_arabic;
  } else if (table === 'matan_user_progress') {
    if ('status_paham' in out && !('memorized' in out)) {
      out.memorized = Boolean(out.status_paham);
    }
    delete out.status_paham;
    delete out.points_awarded;
  }
  return out;
}

function sanitizeIdentifier(name: string): string {
  // Only allow alphanumeric and underscores
  if (typeof name !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new BadRequest(`Invalid identifier: ${name}`);
  }
  // If has uppercase, quote it
  return /[A-Z]/.test(name) ? `"${name}"` : name;
}

function toDbValue(val: any) {
  if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
    return JSON.stringify(val);
  }
  return val;
}

type Filter = { column: string; op?: string; value: any };

/**
 * Build WHERE clauses from client filters. For writes (strict), a filter without a
 * value is rejected instead of silently dropped, so a lost filter can never widen an
 * UPDATE or DELETE.
 */
function buildWhere(filters: Filter[], values: any[], strict: boolean, table?: string): string[] {
  const clauses: string[] = [];
  if (!Array.isArray(filters)) return clauses;

  for (const f of filters) {
    if (!f || !f.column) continue;
    if (f.value === undefined) {
      if (strict) throw new BadRequest(`Filter '${f.column}' tidak memiliki nilai`);
      continue;
    }
    const colName = mapColumnName(table, f.column);
    const col = sanitizeIdentifier(colName);
    const op = (f.op || 'eq').toLowerCase();
    const param = (v: any) => {
      values.push(v);
      return `$${values.length}`;
    };

    switch (op) {
      case 'eq':
        clauses.push(f.value === null ? `${col} IS NULL` : `${col} = ${param(f.value)}`);
        break;
      case 'neq':
        clauses.push(f.value === null ? `${col} IS NOT NULL` : `${col} != ${param(f.value)}`);
        break;
      case 'gt': clauses.push(`${col} > ${param(f.value)}`); break;
      case 'gte': clauses.push(`${col} >= ${param(f.value)}`); break;
      case 'lt': clauses.push(`${col} < ${param(f.value)}`); break;
      case 'lte': clauses.push(`${col} <= ${param(f.value)}`); break;
      case 'in':
        if (Array.isArray(f.value) && f.value.length > 0) {
          clauses.push(`${col} IN (${f.value.map(param).join(', ')})`);
        } else {
          clauses.push('1 = 0');
        }
        break;
      case 'contains':
        clauses.push(`${col} @> ${param(JSON.stringify(f.value))}::jsonb`);
        break;
      case 'ilike':
        clauses.push(`${col} ILIKE ${param(f.value)}`);
        break;
      case 'is':
        if (f.value === null) clauses.push(`${col} IS NULL`);
        else if (f.value === true) clauses.push(`${col} IS TRUE`);
        else if (f.value === false) clauses.push(`${col} IS FALSE`);
        else throw new BadRequest(`Nilai tidak valid untuk operator 'is'`);
        break;
      case 'not_is':
      case 'is_not':
        if (f.value === null) clauses.push(`${col} IS NOT NULL`);
        else if (f.value === true) clauses.push(`${col} IS NOT TRUE`);
        else if (f.value === false) clauses.push(`${col} IS NOT FALSE`);
        else throw new BadRequest(`Nilai tidak valid untuk operator 'not_is'`);
        break;
      default:
        throw new BadRequest(`Operator '${op}' tidak didukung`);
    }
  }
  return clauses;
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) throw new BadRequest('Select tidak valid');
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (depth !== 0) throw new BadRequest('Select tidak valid');
  parts.push(current.trim());
  return parts.filter(Boolean);
}

/**
 * Parse a Supabase-style select list. Supported: `*`, plain columns, and many-to-one
 * embeds like `vouchers(*)` or `users(username, email)` (joined via `<singular>_id`).
 * Anything else is rejected, so no client text is ever spliced into SQL.
 */
function buildSelectList(select: string, ctx: AuthContext, table?: string): { sql: string; embeds: string[] } {
  if (typeof select !== 'string' || select.trim() === '' || select.trim() === '*') {
    return { sql: 't.*', embeds: [] };
  }

  const embeds: string[] = [];
  const cols = splitTopLevel(select).map((token) => {
    if (token === '*') return 't.*';
    if (table === 'users' && token === 'paid_juz') return 't."paidJuz" AS paid_juz';
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
      const mapped = mapColumnName(table, token);
      if (mapped !== token) {
        return `t.${sanitizeIdentifier(mapped)} AS ${sanitizeIdentifier(token)}`;
      }
      return `t.${sanitizeIdentifier(token)}`;
    }

    const m = token.match(/^([a-z_]+)\s*\(([^()]*)\)$/);
    if (!m) throw new BadRequest(`Kolom select tidak valid: ${token}`);
    const rel = m[1];
    if (!ALLOWED_TABLES.has(rel) || !rel.endsWith('s')) throw new BadRequest(`Relasi '${rel}' tidak diizinkan`);
    if (checkRead(rel, ctx).ownerFilter) throw new BadRequest(`Relasi '${rel}' tidak diizinkan`);

    const fk = sanitizeIdentifier(`${rel.slice(0, -1)}_id`);
    const inner = m[2].trim();
    let obj = 'to_jsonb(r)';
    if (inner !== '' && inner !== '*') {
      const innerCols = inner.split(',').map((c) => c.trim()).filter(Boolean);
      obj = `jsonb_build_object(${innerCols.map((c) => `'${c}', r.${sanitizeIdentifier(mapColumnName(rel, c))}`).join(', ')})`;
    }
    embeds.push(rel);
    return `(SELECT ${obj} FROM public.${rel} r WHERE r.id = t.${fk} LIMIT 1) AS ${rel}`;
  });

  return { sql: cols.join(', '), embeds };
}

function redactRows(table: string, rows: any[], embeds: string[], ctx: AuthContext) {
  return rows.map((row) => {
    let out = table === 'users' ? redactUserRow(row, ctx) : row;
    if (embeds.includes('users') && out?.users) {
      out = { ...out, users: redactUserRow(out.users, ctx) };
    }
    return out;
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const table = typeof body.table === 'string' ? body.table.toLowerCase() : '';

    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: { message: `Tabel '${body.table}' tidak diizinkan atau tidak valid` } }, { status: 400 });
    }

    const ctx = await getAuthContext(req);
    const safeTable = `public.${table}`;
    // 1. SELECT
    if (action === 'select') {
      const {
        select = '*',
        filters = [],
        orderBy = [],
        limit,
        offset,
        single = false,
        maybeSingle = false,
        countOnly = false,
      } = body;

      const policy = checkRead(table, ctx);
      const values: any[] = [];
      const whereClauses = buildWhere(filters, values, false, table);
      if (policy.ownerFilter) {
        values.push(policy.ownerFilter.value);
        whereClauses.push(`t.${sanitizeIdentifier(policy.ownerFilter.column)} = $${values.length}`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Count only
      if (countOnly) {
        const countSql = `SELECT count(*)::int as count FROM ${safeTable} t ${whereSql}`;
        const { rows } = await query(countSql, values);
        return NextResponse.json({ count: rows[0]?.count || 0, data: null, error: null });
      }

      // Order By
      let orderSql = '';
      if (Array.isArray(orderBy) && orderBy.length > 0) {
        const orderClauses = orderBy.map((o: any) => {
          const colName = mapColumnName(table, o.column);
          const col = sanitizeIdentifier(colName);
          const dir = o.ascending === false ? 'DESC' : 'ASC';
          const nulls = o.nullsFirst ? 'NULLS FIRST' : 'NULLS LAST';
          return `t.${col} ${dir} ${nulls}`;
        });
        orderSql = `ORDER BY ${orderClauses.join(', ')}`;
      }

      // Pagination
      const limitSql = Number.isFinite(limit) ? `LIMIT ${Math.max(0, Math.floor(limit))}` : '';
      const offsetSql = Number.isFinite(offset) ? `OFFSET ${Math.max(0, Math.floor(offset))}` : '';

      const { sql: selectCols, embeds } = buildSelectList(select, ctx, table);

      const sql = `SELECT ${selectCols} FROM ${safeTable} t ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
      const { rows: rawRows } = await query(sql, values);
      const rows = redactRows(table, rawRows, embeds, ctx);

      if (single) {
        if (rows.length === 0) {
          return NextResponse.json({ data: null, error: { message: 'Row not found' } }, { status: 404 });
        }
        return NextResponse.json({ data: rows[0], error: null });
      }

      if (maybeSingle) {
        return NextResponse.json({ data: rows[0] || null, error: null });
      }

      return NextResponse.json({ data: rows, error: null });
    }

    if (!['insert', 'update', 'upsert', 'delete'].includes(action)) {
      return NextResponse.json({ error: { message: `Aksi '${action}' tidak didukung` } }, { status: 400 });
    }

    const { ownerColumn } = checkWrite(table, action, ctx);
    const staff = isStaff(ctx);

    // 2. INSERT and 4. UPSERT
    if (action === 'insert' || action === 'upsert') {
      const { data, returning = true } = body;
      if (!data) {
        return NextResponse.json({ error: { message: 'Data is required' } }, { status: 400 });
      }

      const records = Array.isArray(data) ? data : [data];
      if (records.length === 0) {
        return NextResponse.json({ data: [], error: null });
      }

      const conflictCols = action === 'upsert'
        ? String(body.onConflict || 'id')
            .split(',')
            .map((c) => mapColumnName(table, c.trim()))
            .filter(Boolean)
        : [];

      const resultRows = [];
      for (const rawRecord of records) {
        let record: Record<string, any> = normalizeTablePayload(table, rawRecord);
        if (ownerColumn) record = sanitizeOwnedRecord(table, record, ownerColumn, ctx, false);

        // Auto generate UUID for id if table uses UUID and id not provided
        if (record.id === undefined && !NON_UUID_PK_TABLES.has(table)) {
          record.id = uuidv4();
        }

        const cols = Object.keys(record);
        const colNames = cols.map(sanitizeIdentifier).join(', ');
        const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = cols.map((c) => toDbValue(record[c]));

        let sql = `INSERT INTO ${safeTable} AS t (${colNames}) VALUES (${placeholders})`;
        const createOnly = !staff && table === 'donations';

        if (action === 'upsert') {
          let conflictAction = 'DO NOTHING';
          if (!body.ignoreDuplicates && !createOnly) {
            // Never rewrite the primary key of an existing row (id may be auto-generated above).
            const updateCols = cols.filter((c) => !conflictCols.includes(c) && c !== 'id');
            if (updateCols.length > 0) {
              conflictAction = `DO UPDATE SET ${updateCols
                .map((c) => `${sanitizeIdentifier(c)} = EXCLUDED.${sanitizeIdentifier(c)}`)
                .join(', ')}`;
              // A learner may only overwrite a conflicting row they own.
              if (ownerColumn) {
                values.push(ctx.userId);
                conflictAction += ` WHERE t.${sanitizeIdentifier(ownerColumn)} = $${values.length}`;
              }
            }
          }
          sql += ` ON CONFLICT (${conflictCols.map(sanitizeIdentifier).join(', ')}) ${conflictAction}`;
        }

        if (returning) sql += ' RETURNING *';

        try {
          const { rows } = await query(sql, values);
          if (rows.length > 0) resultRows.push(rows[0]);
        } catch (upsertErr: any) {
          // Fallback if PostgreSQL table lacks a formal UNIQUE constraint on conflictCols (SQLSTATE 42P10)
          if (action === 'upsert' && upsertErr?.code === '42P10' && conflictCols.length > 0) {
            const matchValues: any[] = [];
            const matchClauses: string[] = [];
            for (const cc of conflictCols) {
              const v = record[cc];
              if (v === null || v === undefined) {
                matchClauses.push(`t.${sanitizeIdentifier(cc)} IS NULL`);
              } else {
                matchValues.push(toDbValue(v));
                matchClauses.push(`t.${sanitizeIdentifier(cc)} = $${matchValues.length}`);
              }
            }
            if (ownerColumn) {
              matchValues.push(ctx.userId);
              matchClauses.push(`t.${sanitizeIdentifier(ownerColumn)} = $${matchValues.length}`);
            }

            const existingRes = await query(
              `SELECT * FROM ${safeTable} AS t WHERE ${matchClauses.join(' AND ')} LIMIT 1`,
              matchValues
            );

            if (existingRes.rows.length > 0) {
              if (body.ignoreDuplicates || createOnly) {
                if (returning) resultRows.push(existingRes.rows[0]);
              } else {
                const updateCols = cols.filter((c) => !conflictCols.includes(c) && c !== 'id');
                if (updateCols.length === 0) {
                  if (returning) resultRows.push(existingRes.rows[0]);
                } else {
                  const updValues: any[] = [];
                  const updSet = updateCols.map((c) => {
                    updValues.push(toDbValue(record[c]));
                    return `${sanitizeIdentifier(c)} = $${updValues.length}`;
                  });
                  const updWhere: string[] = [];
                  for (const cc of conflictCols) {
                    const v = record[cc];
                    if (v === null || v === undefined) {
                      updWhere.push(`${sanitizeIdentifier(cc)} IS NULL`);
                    } else {
                      updValues.push(toDbValue(v));
                      updWhere.push(`${sanitizeIdentifier(cc)} = $${updValues.length}`);
                    }
                  }
                  if (ownerColumn) {
                    updValues.push(ctx.userId);
                    updWhere.push(`${sanitizeIdentifier(ownerColumn)} = $${updValues.length}`);
                  }
                  const updRes = await query(
                    `UPDATE ${safeTable} SET ${updSet.join(', ')} WHERE ${updWhere.join(' AND ')} ${returning ? 'RETURNING *' : ''}`,
                    updValues
                  );
                  if (updRes.rows.length > 0) resultRows.push(updRes.rows[0]);
                }
              }
            } else {
              const insValues = cols.map((c) => toDbValue(record[c]));
              const insRes = await query(
                `INSERT INTO ${safeTable} (${colNames}) VALUES (${placeholders}) ${returning ? 'RETURNING *' : ''}`,
                insValues
              );
              if (insRes.rows.length > 0) resultRows.push(insRes.rows[0]);
            }
          } else {
            throw upsertErr;
          }
        }
      }

      const redacted = redactRows(table, resultRows, [], ctx);
      return NextResponse.json({
        data: Array.isArray(data) ? redacted : redacted[0] || null,
        error: null,
      });
    }

    // 3. UPDATE
    if (action === 'update') {
      const { filters = [], returning = true } = body;
      let data: Record<string, any> = body.data;
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        return NextResponse.json({ error: { message: 'Data is required' } }, { status: 400 });
      }
      data = normalizeTablePayload(table, data);
      if (ownerColumn) data = sanitizeOwnedRecord(table, data, ownerColumn, ctx, true);

      const cols = Object.keys(data);
      if (cols.length === 0) {
        return NextResponse.json({ error: { message: 'Data is required' } }, { status: 400 });
      }
      const values: any[] = [];
      const setClauses = cols.map((col) => {
        values.push(toDbValue(data[col]));
        return `${sanitizeIdentifier(col)} = $${values.length}`;
      });

      const whereClauses = buildWhere(filters, values, true, table);
      if (whereClauses.length === 0) {
        return NextResponse.json({ error: { message: 'Refusing update without WHERE clause' } }, { status: 400 });
      }
      if (ownerColumn) {
        values.push(ctx.userId);
        whereClauses.push(`${sanitizeIdentifier(ownerColumn)} = $${values.length}`);
      }

      const sql = `UPDATE ${safeTable} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} ${returning ? 'RETURNING *' : ''}`;
      const { rows } = await query(sql, values);

      return NextResponse.json({ data: redactRows(table, rows, [], ctx), error: null });
    }

    // 5. DELETE (admin only, enforced by checkWrite)
    const { filters = [], returning = true } = body;
    const values: any[] = [];
    const whereClauses = buildWhere(filters, values, true, table);

    if (whereClauses.length === 0) {
      return NextResponse.json({ error: { message: 'Refusing delete without WHERE clause' } }, { status: 400 });
    }

    const sql = `DELETE FROM ${safeTable} WHERE ${whereClauses.join(' AND ')} ${returning ? 'RETURNING *' : ''}`;
    const { rows } = await query(sql, values);

    return NextResponse.json({ data: redactRows(table, rows, [], ctx), error: null });
  } catch (err: any) {
    if (err instanceof PolicyError) {
      return NextResponse.json({ error: { message: err.message } }, { status: err.status });
    }
    if (err instanceof BadRequest) {
      return NextResponse.json({ error: { message: err.message } }, { status: 400 });
    }
    console.error('[DB_API_ERROR]:', err);
    // Postgres errors carry a SQLSTATE code the client relies on (e.g. 23505 duplicate key).
    if (err?.code) {
      return NextResponse.json({ error: { message: err.message, code: err.code } }, { status: 500 });
    }
    return NextResponse.json({ error: { message: 'Database error' } }, { status: 500 });
  }
}
