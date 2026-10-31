'use client';

import { db } from './client';

/** Initiate email/password sign-in. */
export async function initiateEmailSignIn(email: string, password: string) {
    return db.auth.signInWithPassword({ email, password });
}

/** Initiate Google sign-in via Self-Hosted Google OAuth 2.0. */
export async function initiateGoogleSignIn(redirectTo?: string) {
    if (typeof window !== 'undefined') {
        const target = `/api/auth/google${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`;
        window.location.href = target;
    }
    return { data: null, error: null };
}

/** Initiate email/password sign-up. */
export async function initiateEmailSignUp(email: string, password: string, options?: { data?: any, emailRedirectTo?: string }) {
    return db.auth.signUp({
        email,
        password,
        options
    });
}

/** Sign out. */
export async function signOut() {
    return db.auth.signOut();
}

/** Initiate password reset. */
export async function initiatePasswordReset(email: string, redirectTo?: string) {
    return db.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`,
    });
}
