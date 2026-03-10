'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call directly. Do NOT use 'await'.
  // Use .catch() to avoid uncaught promise errors in console which trigger dev overlays.
  signInAnonymously(authInstance).catch(() => {});
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call directly. Do NOT use 'await'.
  createUserWithEmailAndPassword(authInstance, email, password).catch(() => {});
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call directly. Do NOT use 'await'.
  signInWithEmailAndPassword(authInstance, email, password).catch(() => {});
}