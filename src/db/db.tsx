import { useState, useEffect, useCallback } from 'react';
import { db } from './client';

export interface UseDocResult<T> {
    data: (T & { id: string }) | null;
    isLoading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
}

export interface CollectionFilter {
    column: string;
    operator: string;
    value: any;
}

export interface CollectionOptions {
    filters?: CollectionFilter[];
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    select?: string;
    /** Legacy compatibility aliases */
    where?: [string, string, any];
    order?: { column: string; ascending?: boolean };
}

function applyQueryFilter(q: any, f: CollectionFilter) {
    const op = f.operator;
    if (op === '==' || op === 'eq') return q.eq(f.column, f.value);
    if (op === '!=' || op === 'neq') return q.neq(f.column, f.value);
    if (op === '>' || op === 'gt') return q.gt(f.column, f.value);
    if (op === '<' || op === 'lt') return q.lt(f.column, f.value);
    if (op === '>=' || op === 'gte') return q.gte(f.column, f.value);
    if (op === '<=' || op === 'lte') return q.lte(f.column, f.value);
    if (op === 'in') return q.in(f.column, f.value);
    if (op === 'contains') return q.contains(f.column, f.value);
    if (op === 'ilike') return q.ilike(f.column, f.value);
    if (op === 'is') return q.is(f.column, f.value);
    if (op === 'not.is' || op === 'not_is' || op === 'is_not') return q.not(f.column, 'is', f.value);
    if (op === 'not_null') return q.not(f.column, 'is', null);
    return q;
}

export function useDoc<T = any>(
    table: string | null | undefined,
    id: string | null | undefined
): UseDocResult<T> {
    const [data, setData] = useState<(T & { id: string }) | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(!!table && !!id);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        if (!table || !id) {
            setIsLoading(false);
            return;
        }
        if (!data) setIsLoading(true);
        setError(null);
        const { data: result, error } = await db
            .from(table)
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            setError(error);
            setData(null);
        } else {
            setData(result as T & { id: string });
        }
        setIsLoading(false);
    }, [table, id]);

    useEffect(() => {
        if (!table || !id) {
            setData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        fetchData();

        const channel = db
            .channel(`${table}:${id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table, filter: `id=eq.${id}` },
                (payload: any) => {
                    if (payload.eventType === 'DELETE') {
                        setData(null);
                    } else {
                        setData(payload.new as T & { id: string });
                    }
                }
            )
            .subscribe();

        return () => {
            db.removeChannel(channel);
        };
    }, [table, id, fetchData]);

    return { data, isLoading, error, refresh: fetchData };
}

export function useCollection<T = any>(
    table: string | null | undefined,
    options?: CollectionOptions | null
) {
    const [data, setData] = useState<(T & { id: string })[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(!!table);
    const [error, setError] = useState<Error | null>(null);

    const optionsKey = JSON.stringify(options);

    const fetchData = useCallback(async () => {
        if (!table) {
            setIsLoading(false);
            return;
        }
        if (data.length === 0) setIsLoading(true);
        setError(null);

        let q = db.from(table).select(options?.select || '*');

        const normalizedFilters: CollectionFilter[] = [
            ...(options?.filters || []),
            ...(options?.where ? [{ column: options.where[0], operator: options.where[1], value: options.where[2] }] : []),
        ];

        if (normalizedFilters.length > 0) {
            if (normalizedFilters.some(f => f.value === undefined && f.operator !== 'not_null')) {
                setIsLoading(false);
                setError(null);
                return;
            }
            normalizedFilters.forEach(f => {
                q = applyQueryFilter(q, f);
            });
        }

        const orderClause = options?.orderBy || options?.order;
        if (orderClause) {
            q = q.order(orderClause.column, { ascending: orderClause.ascending ?? false });
        }

        if (options?.limit) {
            q = q.limit(options.limit);
        }

        const { data: result, error } = await q;

        if (error) {
            setError(error);
        } else {
            setData((result as unknown as (T & { id: string })[]) || []);
        }
        setIsLoading(false);
    }, [table, optionsKey]);

    useEffect(() => {
        if (!table) {
            setData([]);
            setIsLoading(false);
            return;
        }

        fetchData();

        const channel = db
            .channel(`${table}:all`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            db.removeChannel(channel);
        };
    }, [table, fetchData]);

    return { data, isLoading, error, refresh: fetchData };
}

export function useCount(
    table: string | null | undefined,
    options?: {
        filters?: CollectionFilter[];
    } | null
) {
    const [count, setCount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(!!table);
    const [error, setError] = useState<Error | null>(null);

    const optionsKey = JSON.stringify(options);

    const fetchCount = useCallback(async () => {
        if (!table) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);

        let q = db.from(table).select('*', { count: 'exact', head: true });

        if (options?.filters) {
            if (options.filters.some(f => f.value === undefined && f.operator !== 'not_null')) {
                setIsLoading(false);
                setError(null);
                return;
            }
            options.filters.forEach(f => {
                q = applyQueryFilter(q, f);
            });
        }

        const { count: resultCount, error } = await q;

        if (error) {
            setError(error);
        } else {
            setCount(resultCount ?? 0);
        }
        setIsLoading(false);
    }, [table, optionsKey]);

    useEffect(() => {
        if (!table) {
            setIsLoading(false);
            return;
        }
        fetchCount();
    }, [table, fetchCount]);

    return { count, isLoading, error, refresh: fetchCount };
}
