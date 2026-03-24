'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './index';
import { User, Session } from '@supabase/supabase-js';

interface SupabaseContextState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    error: Error | null;
}

export const SupabaseContext = createContext<SupabaseContextState | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<SupabaseContextState>({
        user: null,
        session: null,
        isLoading: true,
        error: null,
    });

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    const errorMsg = error.message.toLowerCase();
                    if (
                        errorMsg.includes('refresh token not found') || 
                        errorMsg.includes('invalid_grant') ||
                        errorMsg.includes('refresh_token_not_found')
                    ) {
                        console.warn('Session expired or invalid, cleaning up...');
                        await supabase.auth.signOut();
                        // Force refresh to clear any lingering states and redirect to login if not already there
                        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                          window.location.href = '/login';
                        }
                    }
                }

                setState(prev => ({
                    ...prev,
                    user: session?.user ?? null,
                    session: session ?? null,
                    isLoading: false,
                }));
            } catch (err: any) {
                console.error('Error initializing auth:', err);
                setState(prev => ({ ...prev, isLoading: false }));
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setState({
                user: session?.user ?? null,
                session: session ?? null,
                isLoading: false,
                error: null,
            });
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <SupabaseContext.Provider value={state}>
            {children}
        </SupabaseContext.Provider>
    );
};

export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (context === undefined) {
        throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
};

export const useUser = () => {
    const { user, isLoading, error } = useSupabase();
    return { user, isUserLoading: isLoading, userError: error };
};
