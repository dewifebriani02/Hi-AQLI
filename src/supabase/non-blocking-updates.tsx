'use client';

import { supabase } from './index';

/**
 * Initiates an insert operation.
 * Does NOT await the write operation internally.
 */
export function addDocumentNonBlocking(table: string, data: any) {
    supabase.from(table).upsert(data).then(({ error }: { error: any }) => {
        if (error) {
            // Abaikan error duplicate key (23505) karena datanya sudah ada
            if (error.code !== '23505') {
                console.error(`Error inserting into ${table}:`, error);
            }
        }
    });
}

/**
 * Initiates an update operation.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(table: string, id: string, data: any) {
    supabase.from(table).update(data).eq('id', id).then(({ error }: { error: any }) => {
        if (error) console.error(`Error updating ${table} (id: ${id}):`, error);
    });
}

/**
 * Initiates a delete operation.
 * Does NOT await the operation internally.
 */
export function deleteDocumentNonBlocking(table: string, id: string) {
    supabase.from(table).delete().eq('id', id).then(({ error }: { error: any }) => {
        if (error) console.error(`Error deleting from ${table} (id: ${id}):`, error);
    });
}
