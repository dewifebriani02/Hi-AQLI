/**
 * Local Database & Auth Adapter for Hostinger VPS (Self-Hosted)
 * Drop-in database client connecting to local PostgreSQL API.
 */

export interface User {
  id: string;
  email?: string;
  role?: string;
  roleId?: string;
  has_password?: boolean;
  user_metadata?: any;
  app_metadata?: any;
  created_at?: string;
}

export interface Session {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  user: User;
}

type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'INITIAL_SESSION';
type AuthChangeCallback = (event: AuthChangeEvent, session: Session | null) => void;

const authSubscribers = new Set<AuthChangeCallback>();

export function notifyAuthChange(event: AuthChangeEvent, session: Session | null) {
  authSubscribers.forEach((cb) => {
    try {
      cb(event, session);
    } catch (e) {
      console.error('[AUTH_NOTIFY_ERROR]', e);
    }
  });
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(json);
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3001';
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('hiaqli_session');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token) {
          if (isTokenExpired(parsed.access_token)) {
            localStorage.removeItem('hiaqli_session');
            localStorage.removeItem('hiaqli_token');
            return null;
          }
          return parsed.access_token;
        }
      } catch {}
    }
    const token = localStorage.getItem('hiaqli_token');
    if (token) {
      if (isTokenExpired(token)) {
        localStorage.removeItem('hiaqli_token');
        return null;
      }
      return token;
    }
  } catch (e) {}
  return null;
}

/**
 * Wrapper around `fetch` for internal API calls that attaches the stored JWT
 * as `Authorization: Bearer <token>` (plus cookie credentials fallback).
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  });
}

class QueryBuilder {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private selectCols: string = '*';
  private filters: { column: string; op: string; value: any }[] = [];
  private orderClauses: { column: string; ascending?: boolean; nullsFirst?: boolean }[] = [];
  private limitCount?: number;
  private offsetCount?: number;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private countMode?: string;
  private payloadData: any = null;
  private onConflictCol?: string;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*', options?: { count?: string; head?: boolean }) {
    this.action = 'select';
    this.selectCols = columns;
    if (options?.count) {
      this.countMode = options.count;
    }
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.payloadData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.payloadData = data;
    return this;
  }

  private ignoreDuplicates: boolean = false;

  upsert(data: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.action = 'upsert';
    this.payloadData = data;
    if (options?.onConflict) {
      this.onConflictCol = options.onConflict;
    }
    if (options?.ignoreDuplicates !== undefined) {
      this.ignoreDuplicates = options.ignoreDuplicates;
    }
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, op: 'neq', value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ column, op: 'gt', value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ column, op: 'gte', value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ column, op: 'lt', value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ column, op: 'lte', value });
    return this;
  }

  in(column: string, value: any[]) {
    this.filters.push({ column, op: 'in', value });
    return this;
  }

  contains(column: string, value: any) {
    this.filters.push({ column, op: 'contains', value });
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push({ column, op: 'ilike', value });
    return this;
  }

  is(column: string, value: any) {
    this.filters.push({ column, op: 'is', value });
    return this;
  }

  not(column: string, operator: string, value: any) {
    const op = operator.toLowerCase();
    if (op === 'is') {
      this.filters.push({ column, op: 'not_is', value });
    } else if (op === 'eq') {
      this.filters.push({ column, op: 'neq', value });
    } else {
      this.filters.push({ column, op: `not_${op}`, value });
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderClauses.push({
      column,
      ascending: options?.ascending !== false,
      nullsFirst: options?.nullsFirst === true,
    });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async execute(): Promise<{ data: any; error: any; count?: number | null }> {
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${getBaseUrl()}/api/db`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: this.action,
          table: this.table,
          select: this.selectCols,
          filters: this.filters,
          orderBy: this.orderClauses,
          limit: this.limitCount,
          offset: this.offsetCount,
          single: this.isSingle,
          maybeSingle: this.isMaybeSingle,
          countOnly: this.countMode === 'exact' && this.selectCols === '*',
          data: this.payloadData,
          onConflict: this.onConflictCol,
          ignoreDuplicates: this.ignoreDuplicates,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        return { data: null, error: json.error || new Error(`HTTP ${res.status}`), count: null };
      }

      return { data: json.data, error: null, count: json.count ?? null };
    } catch (err: any) {
      return { data: null, error: err, count: null };
    }
  }

  // Promise resolution
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export function createLocalClient() {
  return {
    from(table: string) {
      return new QueryBuilder(table);
    },

    auth: {
      async getSession(): Promise<{ data: { session: Session | null }; error: any }> {
        if (typeof window === 'undefined') {
          return { data: { session: null }, error: null };
        }
        try {
          const raw = localStorage.getItem('hiaqli_session');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.access_token) {
              if (isTokenExpired(parsed.access_token)) {
                localStorage.removeItem('hiaqli_session');
                localStorage.removeItem('hiaqli_token');
                notifyAuthChange('SIGNED_OUT', null);
                return { data: { session: null }, error: null };
              }
              return { data: { session: parsed }, error: null };
            }
          }

          // Fallback to fetch /api/auth/me
          const res = await fetch(`${getBaseUrl()}/api/auth/me`, { credentials: 'include' });
          if (res.ok) {
            const json = await res.json();
            if (json.data?.session) {
              try {
                localStorage.setItem('hiaqli_session', JSON.stringify(json.data.session));
                localStorage.setItem('hiaqli_token', json.data.session.access_token);
              } catch (e) {}
              return { data: { session: json.data.session }, error: null };
            }
          }
        } catch (e) {}

        return { data: { session: null }, error: null };
      },

      async getUser(): Promise<{ data: { user: User | null }; error: any }> {
        const { data } = await this.getSession();
        return { data: { user: data.session?.user || null }, error: null };
      },

      async signInWithPassword({ email, password }: { email: string; password: string }) {
        try {
          const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            return { data: { user: null, session: null }, error: json.error || new Error('Login failed') };
          }
          if (typeof window !== 'undefined' && json.data?.session) {
            localStorage.setItem('hiaqli_session', JSON.stringify(json.data.session));
            localStorage.setItem('hiaqli_token', json.data.session.access_token);
            notifyAuthChange('SIGNED_IN', json.data.session);
          }
          return { data: json.data, error: null };
        } catch (err: any) {
          return { data: { user: null, session: null }, error: err };
        }
      },

      async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
        try {
          const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, options }),
            credentials: 'include',
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            return { data: { user: null, session: null }, error: json.error || new Error('Sign up failed') };
          }
          if (typeof window !== 'undefined' && json.data?.session) {
            localStorage.setItem('hiaqli_session', JSON.stringify(json.data.session));
            localStorage.setItem('hiaqli_token', json.data.session.access_token);
            notifyAuthChange('SIGNED_IN', json.data.session);
          }
          return { data: json.data, error: null };
        } catch (err: any) {
          return { data: { user: null, session: null }, error: err };
        }
      },

      async updateUser(attributes: {
        password?: string;
        current_password?: string;
        data?: Record<string, any>;
      }): Promise<{ data: { user: User | null }; error: any }> {
        try {
          const res = await authFetch(`${getBaseUrl()}/api/auth/set-password`, {
            method: 'POST',
            body: JSON.stringify(attributes),
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            return { data: { user: null }, error: json.error || new Error('Gagal memperbarui kata sandi') };
          }
          if (typeof window !== 'undefined' && json.data?.session) {
            try {
              localStorage.setItem('hiaqli_session', JSON.stringify(json.data.session));
              localStorage.setItem('hiaqli_token', json.data.session.access_token);
            } catch (e) {}
            notifyAuthChange('USER_UPDATED', json.data.session);
          }
          return { data: { user: json.data?.user || null }, error: null };
        } catch (err: any) {
          return { data: { user: null }, error: err };
        }
      },

      async signOut() {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('hiaqli_session');
            localStorage.removeItem('hiaqli_token');
          } catch (e) {}
          try {
            await fetch(`${getBaseUrl()}/api/auth/logout`, { method: 'POST', credentials: 'include' });
          } catch (e) {}
          notifyAuthChange('SIGNED_OUT', null);
        }
        return { error: null };
      },

      onAuthStateChange(callback: AuthChangeCallback) {
        authSubscribers.add(callback);
        // Dispatch initial session async
        setTimeout(async () => {
          const { data } = await this.getSession();
          callback('INITIAL_SESSION', data.session);
        }, 10);

        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authSubscribers.delete(callback);
              },
            },
          },
        };
      },

      async signInWithOAuth({ provider, options }: { provider: string; options?: any }) {
        if (provider === 'google' && typeof window !== 'undefined') {
          const redirectTo = options?.redirectTo || '/';
          window.location.href = `/api/auth/google?redirectTo=${encodeURIComponent(redirectTo)}`;
          return { data: null, error: null };
        }
        return { data: null, error: new Error(`OAuth provider '${provider}' tidak didukung.`) };
      },

      async resetPasswordForEmail(email: string, options?: any) {
        return { data: { message: 'Silakan hubungi admin untuk reset password' }, error: null };
      },
    },

    channel(name: string) {
      return {
        on(event: string, filter: any, callback: (payload: any) => void) {
          return this;
        },
        subscribe() {
          return this;
        },
      };
    },

    removeChannel(channel: any) {
      // noop
    },

    storage: {
      from(bucket: string) {
        return {
          async upload(filePath: string, file: File | Blob | any) {
            try {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('bucket', bucket);
              formData.append('path', filePath);

              const token = getStoredToken();
              const headers: Record<string, string> = {};
              if (token) headers['Authorization'] = `Bearer ${token}`;

              const res = await fetch(`${getBaseUrl()}/api/upload`, {
                method: 'POST',
                headers,
                body: formData,
              });

              const json = await res.json();
              if (!res.ok || json.error) {
                return { data: null, error: json.error || new Error('Upload gagal') };
              }
              return { data: json.data, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          },
          getPublicUrl(filePath: string) {
            const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            return {
              data: {
                publicUrl: `${getBaseUrl()}/uploads/${cleanPath}`,
              },
            };
          },
        };
      },
    },

    rpc(fn: string, params?: any) {
      return Promise.resolve({ data: null, error: null });
    },
  };
}

export const db = createLocalClient();
