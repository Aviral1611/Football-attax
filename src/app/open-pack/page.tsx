'use client';

import { useState, useEffect } from 'react';
import { Player } from '@/types/player';
import { openPack, FREE_PACKS_PER_DAY } from '@/lib/packOpening';
import { getUserData, openPackAndSave, UserData, getRemainingPacks } from '@/lib/userService';
import { useAuth } from '@/context/AuthContext';
import PlayerCard from '@/components/PlayerCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

type PackState = 'loading' | 'ready' | 'opening' | 'revealing' | 'complete';

export default function OpenPackPage() {
    return (
        <ProtectedRoute>
            <PackOpeningContent />
        </ProtectedRoute>
    );
}

function PackOpeningContent() {
    const { user } = useAuth();
    const [packState, setPackState] = useState<PackState>('loading');
    const [cards, setCards] = useState<Player[]>([]);
    const [revealedCount, setRevealedCount] = useState(0);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [packResult, setPackResult] = useState<{
        newCards: Player[];
        duplicates: Player[];
        pointsEarned: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load user data on mount
    useEffect(() => {
        async function loadUserData() {
            if (!user) return;
            try {
                const data = await getUserData(user.uid);
                setUserData(data);
                setPackState('ready');
            } catch (err) {
                console.error('Error loading user data:', err);
                setError('Failed to load user data. Please refresh.');
            }
        }
        loadUserData();
    }, [user]);

    const packsRemaining = userData ? getRemainingPacks(userData) : 0;

    // Open pack handler
    const handleOpenPack = async () => {
        if (!user || !userData || packsRemaining <= 0) return;

        setPackState('opening');
        setError(null);

        // Simulate suspense
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate cards
        const newPack = openPack();

        // Save to Firestore
        try {
            const result = await openPackAndSave(user.uid, newPack, userData);

            if (!result.success) {
                setError(result.error || 'Failed to open pack');
                setPackState('ready');
                return;
            }

            // Update local state
            setCards(newPack);
            setPackResult(result);
            setRevealedCount(0);
            setPackState('revealing');

            // Update userData locally
            setUserData(prev => prev ? {
                ...prev,
                packsOpenedToday: prev.packsOpenedToday + 1,
                points: prev.points + result.pointsEarned,
                inventory: [...prev.inventory, ...result.newCards.map(c => c.id)],
            } : null);

        } catch (err) {
            console.error('Error saving pack:', err);
            setError('Failed to save pack. Please try again.');
            setPackState('ready');
        }
    };

    // Reveal next card
    const revealNextCard = () => {
        if (revealedCount < cards.length) {
            setRevealedCount(prev => prev + 1);
        }

        if (revealedCount + 1 >= cards.length) {
            setPackState('complete');
        }
    };

    // Reveal all remaining cards
    const revealAll = () => {
        setRevealedCount(cards.length);
        setPackState('complete');
    };

    // Reset for new pack
    const openAnother = () => {
        setCards([]);
        setRevealedCount(0);
        setPackResult(null);
        setPackState('ready');
    };

    // Loading state
    if (packState === 'loading') {
        return (
            <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-bounce mb-4">⚽</div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                    ← Back
                </Link>
                <div className="flex gap-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{packsRemaining}</div>
                        <div className="text-xs text-gray-400">Packs Left</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-amber-400">{userData?.points || 0}</div>
                        <div className="text-xs text-gray-400">Points</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{userData?.inventory.length || 0}</div>
                        <div className="text-xs text-gray-400">Cards</div>
                    </div>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center">
                    {error}
                </div>
            )}

            {/* Main content */}
            <div className="max-w-6xl mx-auto">
                {/* Ready state - Show pack to open */}
                {packState === 'ready' && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <div
                            onClick={packsRemaining > 0 ? handleOpenPack : undefined}
                            className={`
                relative w-64 h-80 rounded-2xl cursor-pointer
                bg-gradient-to-br from-amber-600 via-yellow-500 to-orange-600
                shadow-2xl shadow-amber-500/30
                flex items-center justify-center
                transform transition-all duration-300
                ${packsRemaining > 0 ? 'hover:scale-105 hover:shadow-amber-500/50' : 'opacity-50 cursor-not-allowed'}
              `}
                        >
                            {/* Pack design */}
                            <div className="absolute inset-2 border-2 border-white/30 rounded-xl" />
                            <div className="text-center">
                                <div className="text-6xl mb-4">🎁</div>
                                <div className="text-2xl font-black text-white drop-shadow-lg">
                                    GOLD PACK
                                </div>
                                <div className="text-sm text-white/80 mt-2">
                                    5 Players
                                </div>
                            </div>

                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity rounded-2xl" />
                        </div>

                        <p className="text-gray-400 mt-8 text-lg">
                            {packsRemaining > 0 ? 'Click to open!' : 'No packs remaining today. Come back tomorrow!'}
                        </p>
                    </div>
                )}

                {/* Opening animation */}
                {packState === 'opening' && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <div className="relative w-64 h-80 rounded-2xl bg-gradient-to-br from-amber-600 via-yellow-500 to-orange-600 animate-pulse">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-6xl animate-bounce">✨</div>
                            </div>
                        </div>
                        <p className="text-amber-400 mt-8 text-xl font-bold animate-pulse">
                            Opening pack...
                        </p>
                    </div>
                )}

                {/* Revealing cards */}
                {(packState === 'revealing' || packState === 'complete') && (
                    <div className="flex flex-col items-center">
                        {/* Cards grid */}
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            {cards.map((card, index) => {
                                const isNew = packResult?.newCards.some(c => c.id === card.id);
                                const isDuplicate = packResult?.duplicates.some(c => c.id === card.id);

                                return (
                                    <div
                                        key={`${card.id}-${index}`}
                                        className={`
                      relative transform transition-all duration-500
                      ${index < revealedCount
                                                ? 'scale-100 opacity-100'
                                                : 'scale-90 opacity-0 pointer-events-none'
                                            }
                    `}
                                        style={{ transitionDelay: `${index * 100}ms` }}
                                    >
                                        <PlayerCard player={card} size="md" />

                                        {/* New/Duplicate badge */}
                                        {index < revealedCount && (
                                            <div className={`
                        absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold
                        ${isNew
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-gray-600 text-gray-200'
                                                }
                      `}>
                                                {isNew ? '✨ NEW' : '🔄 DUP'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-4">
                            {packState === 'revealing' && (
                                <>
                                    <button
                                        onClick={revealNextCard}
                                        className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white hover:scale-105 transition-transform"
                                    >
                                        Reveal Next ({cards.length - revealedCount} left)
                                    </button>
                                    <button
                                        onClick={revealAll}
                                        className="px-8 py-3 bg-gray-700 rounded-xl font-bold text-white hover:bg-gray-600 transition-colors"
                                    >
                                        Reveal All
                                    </button>
                                </>
                            )}

                            {packState === 'complete' && packResult && (
                                <div className="text-center">
                                    {/* Results summary */}
                                    <div className="mb-4 space-y-2">
                                        {packResult.newCards.length > 0 && (
                                            <div className="text-green-400 text-lg font-bold">
                                                +{packResult.newCards.length} new card{packResult.newCards.length > 1 ? 's' : ''}!
                                            </div>
                                        )}
                                        {packResult.pointsEarned > 0 && (
                                            <div className="text-amber-400 text-lg font-bold">
                                                +{packResult.pointsEarned} points from duplicates
                                            </div>
                                        )}
                                    </div>

                                    {packsRemaining > 0 ? (
                                        <button
                                            onClick={openAnother}
                                            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white hover:scale-105 transition-transform"
                                        >
                                            Open Another Pack ({packsRemaining} left)
                                        </button>
                                    ) : (
                                        <div className="text-gray-400">
                                            No more packs today. Come back tomorrow!
                                            <div className="flex gap-4 justify-center mt-4">
                                                <Link
                                                    href="/shop"
                                                    className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg text-white font-bold hover:scale-105 transition-transform"
                                                >
                                                    🛒 Buy More Packs
                                                </Link>
                                                <Link
                                                    href="/inventory"
                                                    className="text-amber-400 hover:text-amber-300 flex items-center"
                                                >
                                                    View Collection →
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Pack summary */}
                        {packState === 'complete' && (
                            <div className="mt-8 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                                <h3 className="text-lg font-bold text-white mb-3">Pack Summary</h3>
                                <div className="flex gap-4 text-sm">
                                    {(['legendary', 'epic', 'rare', 'common'] as const).map(rarity => {
                                        const count = cards.filter(c => c.rarity === rarity).length;
                                        if (count === 0) return null;
                                        const colors = {
                                            legendary: 'text-yellow-400',
                                            epic: 'text-purple-400',
                                            rare: 'text-blue-400',
                                            common: 'text-gray-400',
                                        };
                                        return (
                                            <span key={rarity} className={colors[rarity]}>
                                                {count}x {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
