'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db, User, Session } from './client';

interface AuthContextState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    error: Error | null;
}

export const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthContextState>({
        user: null,
        session: null,
        isLoading: true,
        error: null,
    });

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await db.auth.getSession();
                
                if (error) {
                    await db.auth.signOut();
                    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                        window.location.href = '/login';
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

        const { data: { subscription } } = db.auth.onAuthStateChange((event, session) => {
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
        <AuthContext.Provider value={state}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const useUser = () => {
    const { user, isLoading, error } = useAuth();
    return { user, isUserLoading: isLoading, userError: error };
};
