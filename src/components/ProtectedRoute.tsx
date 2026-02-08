'use client';

import { useAuth } from '@/context/AuthContext';
import { ReactNode } from 'react';
import Link from 'next/link';

interface ProtectedRouteProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
    const { user, loading } = useAuth();

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-bounce mb-4">⚽</div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Show sign-in prompt if not authenticated
    if (!user) {
        if (fallback) return <>{fallback}</>;

        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <div className="text-8xl mb-6">🔐</div>
                    <h1 className="text-3xl font-bold text-white mb-4">
                        Sign In Required
                    </h1>
                    <p className="text-gray-400 mb-8">
                        You need to sign in to access this feature. Create an account to start collecting players!
                    </p>
                    <Link
                        href="/login"
                        className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white text-lg hover:scale-105 transition-transform shadow-lg shadow-orange-500/30"
                    >
                        Sign In / Sign Up
                    </Link>
                </div>
            </div>
        );
    }

    // User is authenticated
    return <>{children}</>;
}
