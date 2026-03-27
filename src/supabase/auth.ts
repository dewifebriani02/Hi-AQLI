'use client';

import { supabase } from './index';

/** Initiate email/password sign-in. */
export async function initiateEmailSignIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
}

/** Initiate Google sign-in. */
export async function initiateGoogleSignIn(redirectTo?: string) {
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    if (redirectTo) callbackUrl.searchParams.set('next', redirectTo);

    return supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: callbackUrl.toString(),
        },
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
