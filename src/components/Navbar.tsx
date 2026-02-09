'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { getUserData, UserData } from '@/lib/userService';

export default function Navbar() {
    const { user, loading, signOut } = useAuth();
    const [userData, setUserData] = useState<UserData | null>(null);

    // Load user data for points display
    useEffect(() => {
        async function loadUserData() {
            if (user) {
                try {
                    const data = await getUserData(user.uid);
                    setUserData(data);
                } catch (err) {
                    console.error('Error loading user data:', err);
                }
            } else {
                setUserData(null);
            }
        }
        loadUserData();

        // Refresh points every 30 seconds
        const interval = setInterval(loadUserData, 30000);
        return () => clearInterval(interval);
    }, [user]);

    return (
        <nav className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">⚽</span>
                    <span className="font-black text-xl bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        FOOTBALL ATTAX
                    </span>
                </Link>

                {/* Nav links */}
                <div className="flex items-center gap-4 md:gap-6">
                    <Link
                        href="/open-pack"
                        className="text-gray-300 hover:text-white transition-colors font-medium text-sm md:text-base"
                    >
                        🎁 <span className="hidden sm:inline">Free</span> Packs
                    </Link>

                    <Link
                        href="/shop"
                        className="text-gray-300 hover:text-white transition-colors font-medium text-sm md:text-base"
                    >
                        🛒 Shop
                    </Link>

                    <Link
                        href="/battle"
                        className="text-gray-300 hover:text-white transition-colors font-medium text-sm md:text-base"
                    >
                        ⚔️ <span className="hidden sm:inline">Battle</span>
                    </Link>

                    <Link
                        href="/quiz"
                        className="text-gray-300 hover:text-white transition-colors font-medium text-sm md:text-base"
                    >
                        🧠 <span className="hidden sm:inline">Quiz</span>
                    </Link>

                    <Link
                        href="/inventory"
                        className="text-gray-300 hover:text-white transition-colors font-medium text-sm md:text-base"
                    >
                        📦 <span className="hidden sm:inline">Inventory</span>
                    </Link>

                    {/* Auth section */}
                    {loading ? (
                        <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
                    ) : user ? (
                        <div className="flex items-center gap-3">
                            {/* Points display */}
                            {userData && (
                                <Link
                                    href="/shop"
                                    className="bg-gray-800 px-3 py-1.5 rounded-lg border border-amber-500/30 hover:border-amber-500/60 transition-colors"
                                >
                                    <span className="text-amber-400 font-bold text-sm">
                                        💰 {userData.points}
                                    </span>
                                </Link>
                            )}

                            {/* User avatar */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                            </div>

                            <button
                                onClick={signOut}
                                className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block"
                            >
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg font-bold text-white text-sm hover:scale-105 transition-transform"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
