import { useState, useEffect, useCallback } from 'react';
import { supabase } from './index';

export interface UseDocResult<T> {
    data: (T & { id: string }) | null;
    isLoading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
}

export function useDoc<T = any>(
    table: string | null | undefined,
    id: string | null | undefined
): UseDocResult<T> {
    const [data, setData] = useState<(T & { id: string }) | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(!!table && !!id);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        if (!table || !id) return;
        setIsLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            setError(error);
            setData(null);
        } else {
            setData(data as T & { id: string });
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

        // Setup real-time subscription
        const channel = supabase
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
            supabase.removeChannel(channel);
        };
    }, [table, id, fetchData]);

    return { data, isLoading, error, refresh: fetchData };
}

export function useCollection<T = any>(
    table: string | null | undefined,
    options?: {
        filters?: { column: string; operator: string; value: any }[];
        orderBy?: { column: string; ascending?: boolean };
        limit?: number;
        select?: string;
    }
) {
    const [data, setData] = useState<(T & { id: string })[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(!!table);
    const [error, setError] = useState<Error | null>(null);

    const optionsKey = JSON.stringify(options);

    const fetchData = useCallback(async () => {
        if (!table) return;
        setIsLoading(true);
        setError(null);

        let q = supabase.from(table).select(options?.select || '*');

        if (options?.filters) {
            // Skip if any filter value is undefined
            if (options.filters.some(f => f.value === undefined)) {
                setData([]);
                setIsLoading(false);
                setError(null);
                return;
            }
            options.filters.forEach(f => {
                if (f.operator === '==') q = q.eq(f.column, f.value);
                if (f.operator === '>') q = q.gt(f.column, f.value);
                if (f.operator === '<') q = q.lt(f.column, f.value);
                if (f.operator === '>=') q = q.gte(f.column, f.value);
                if (f.operator === '<=') q = q.lte(f.column, f.value);
                if (f.operator === 'in') q = q.in(f.column, f.value);
            });
        }

        if (options?.orderBy) {
            q = q.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? false });
        }

        if (options?.limit) {
            q = q.limit(options.limit);
        }

        const { data, error } = await q;

        if (error) {
            setError(error);
        } else {
            setData(data as unknown as (T & { id: string })[]);
        }
        setIsLoading(false);
    }, [table, optionsKey]);

    useEffect(() => {
        if (!table) return;

        fetchData();

        const channel = supabase
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
            supabase.removeChannel(channel);
        };
    }, [table, fetchData]);

    return { data, isLoading, error, refresh: fetchData };
}

export function useCount(
    table: string | null | undefined,
    options?: {
        filters?: { column: string; operator: string; value: any }[];
    }
) {
    const [count, setCount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(!!table);
    const [error, setError] = useState<Error | null>(null);

    const optionsKey = JSON.stringify(options);

    const fetchCount = useCallback(async () => {
        if (!table) return;
        setIsLoading(true);
        setError(null);

        let q = supabase.from(table).select('*', { count: 'exact', head: true });

        if (options?.filters) {
            options.filters.forEach(f => {
                if (f.operator === '==') q = q.eq(f.column, f.value);
                if (f.operator === '>') q = q.gt(f.column, f.value);
                if (f.operator === '<') q = q.lt(f.column, f.value);
                if (f.operator === '>=') q = q.gte(f.column, f.value);
                if (f.operator === '<=') q = q.lte(f.column, f.value);
            });
        }

        const { count, error } = await q;

        if (error) {
            setError(error);
        } else {
            setCount(count);
        }
        setIsLoading(false);
    }, [table, optionsKey]);

    useEffect(() => {
        if (!table) return;
        fetchCount();
    }, [table, fetchCount]);

    return { count, isLoading, error, refresh: fetchCount };
}
