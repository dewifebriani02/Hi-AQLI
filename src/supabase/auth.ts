'use client';

import { supabase } from './index';

/** Initiate email/password sign-in. */
export async function initiateEmailSignIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
}

/** Initiate Google sign-in. */
export async function initiateGoogleSignIn(redirectTo?: string) {
    // Force official domain in production to avoid www/non-www mismatch issues
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const origin = isLocal ? window.location.origin : 'https://hiaqli.pro';
    
    const callbackUrl = new URL(`${origin}/auth/callback`);
    if (redirectTo) callbackUrl.searchParams.set('next', redirectTo);

    return supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: callbackUrl.toString(),
            queryParams: {
                prompt: 'select_account',
                access_type: 'offline',
            },
            // PKCE is standard in newer supabase-js v2, 
            // but we can try to force it via the redirectTo structure 
            // if the library type doesn't support the explicit flowType property.
        } as any,
    });
}

/** Initiate email/password sign-up. */
export async function initiateEmailSignUp(email: string, password: string, options?: { data?: any, emailRedirectTo?: string }) {
    return supabase.auth.signUp({
        email,
        password,
        options
    });
}

/** Sign out. */
export async function signOut() {
    return supabase.auth.signOut();
}

/** Initiate password reset. */
export async function initiatePasswordReset(email: string, redirectTo?: string) {
    return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`,
    });
}
