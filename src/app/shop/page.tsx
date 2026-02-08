'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserData, UserData, buyPackWithPoints } from '@/lib/userService';
import { PACK_TYPES, PackType, openPack } from '@/lib/packOpening';
import { Player } from '@/types/player';
import PlayerCard from '@/components/PlayerCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

type ShopState = 'browsing' | 'opening' | 'revealing' | 'complete';

export default function ShopPage() {
    return (
        <ProtectedRoute>
            <ShopContent />
        </ProtectedRoute>
    );
}

function ShopContent() {
    const { user } = useAuth();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [shopState, setShopState] = useState<ShopState>('browsing');
    const [selectedPack, setSelectedPack] = useState<PackType | null>(null);
    const [cards, setCards] = useState<Player[]>([]);
    const [revealedCount, setRevealedCount] = useState(0);
    const [packResult, setPackResult] = useState<{
        newCards: Player[];
        duplicates: Player[];
        pointsEarned: number;
        pointsSpent: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load user data
    useEffect(() => {
        async function loadUserData() {
            if (!user) return;
            try {
                const data = await getUserData(user.uid);
                setUserData(data);
            } catch (err) {
                console.error('Error loading user data:', err);
                setError('Failed to load user data');
            } finally {
                setLoading(false);
            }
        }
        loadUserData();
    }, [user]);

    // Buy pack handler
    const handleBuyPack = async (packType: PackType) => {
        if (!user || !userData) return;

        const packInfo = PACK_TYPES[packType];
        if (userData.points < packInfo.price) {
            setError(`Not enough points! Need ${packInfo.price}`);
            return;
        }

        setSelectedPack(packType);
        setShopState('opening');
        setError(null);

        // Suspense delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate cards with pack-specific drop rates
        const newPack = openPack(packType);

        try {
            const result = await buyPackWithPoints(user.uid, newPack, userData, packType);

            if (!result.success) {
                setError(result.error || 'Failed to purchase pack');
                setShopState('browsing');
                return;
            }

            setCards(newPack);
            setPackResult(result);
            setRevealedCount(0);
            setShopState('revealing');

            // Update local state
            setUserData(prev => prev ? {
                ...prev,
                points: prev.points - result.pointsSpent + result.pointsEarned,
                inventory: [...prev.inventory, ...result.newCards.map(c => c.id)],
            } : null);

        } catch (err) {
            console.error('Error buying pack:', err);
            setError('Failed to purchase pack');
            setShopState('browsing');
        }
    };

    const revealNextCard = () => {
        if (revealedCount < cards.length) {
            setRevealedCount(prev => prev + 1);
        }
        if (revealedCount + 1 >= cards.length) {
            setShopState('complete');
        }
    };

    const revealAll = () => {
        setRevealedCount(cards.length);
        setShopState('complete');
    };

    const backToShop = () => {
        setCards([]);
        setRevealedCount(0);
        setPackResult(null);
        setSelectedPack(null);
        setShopState('browsing');
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-bounce mb-4">🛒</div>
                    <p className="text-gray-400">Loading shop...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
                <div>
                    <h1 className="text-4xl font-black text-white mb-1">🛒 Pack Shop</h1>
                    <p className="text-gray-400">Buy packs with your points</p>
                </div>
                <div className="text-center bg-gray-800/50 px-6 py-3 rounded-xl border border-amber-500/30">
                    <div className="text-3xl font-bold text-amber-400">{userData?.points || 0}</div>
                    <div className="text-xs text-gray-400">Points</div>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center">
                    {error}
                    <button onClick={() => setError(null)} className="ml-4 text-sm underline">Dismiss</button>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                {/* Shop browsing state */}
                {shopState === 'browsing' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {(Object.entries(PACK_TYPES) as [PackType, typeof PACK_TYPES[PackType]][]).map(([type, pack]) => {
                            const canAfford = (userData?.points || 0) >= pack.price;

                            return (
                                <div
                                    key={type}
                                    className={`
                    relative rounded-2xl overflow-hidden
                    bg-gradient-to-br ${pack.color}
                    border-2 ${pack.borderColor}
                    transition-all duration-300
                    ${canAfford ? 'hover:scale-105 cursor-pointer' : 'opacity-60 cursor-not-allowed'}
                  `}
                                    onClick={() => canAfford && handleBuyPack(type)}
                                >
                                    {/* Pack content */}
                                    <div className="p-6 text-center">
                                        <div className="text-5xl mb-4">{pack.emoji}</div>
                                        <h3 className="text-xl font-bold text-white mb-2">{pack.name}</h3>

                                        {/* Drop rates */}
                                        <div className="text-xs text-white/70 mb-4 space-y-1">
                                            <div>👑 Icon: {(pack.dropRates.icon * 100).toFixed(1)}%</div>
                                            <div>⭐ Legendary: {(pack.dropRates.legendary * 100).toFixed(1)}%</div>
                                            <div>💜 Epic: {(pack.dropRates.epic * 100)}%</div>
                                            <div>💙 Rare: {(pack.dropRates.rare * 100)}%</div>
                                        </div>

                                        {/* Price */}
                                        <div className={`
                      inline-block px-4 py-2 rounded-lg font-bold
                      ${canAfford ? 'bg-white/20 text-white' : 'bg-red-500/50 text-red-200'}
                    `}>
                                            💰 {pack.price} pts
                                        </div>
                                    </div>

                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Opening animation */}
                {shopState === 'opening' && selectedPack && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <div className={`
              relative w-64 h-80 rounded-2xl 
              bg-gradient-to-br ${PACK_TYPES[selectedPack].color}
              animate-pulse
            `}>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-6xl animate-bounce">✨</div>
                            </div>
                        </div>
                        <p className="text-amber-400 mt-8 text-xl font-bold animate-pulse">
                            Opening {PACK_TYPES[selectedPack].name}...
                        </p>
                    </div>
                )}

                {/* Revealing cards */}
                {(shopState === 'revealing' || shopState === 'complete') && (
                    <div className="flex flex-col items-center">
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            {cards.map((card, index) => {
                                const isNew = packResult?.newCards.some(c => c.id === card.id);

                                return (
                                    <div
                                        key={`${card.id}-${index}`}
                                        className={`
                      relative transform transition-all duration-500
                      ${index < revealedCount ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}
                    `}
                                        style={{ transitionDelay: `${index * 100}ms` }}
                                    >
                                        <PlayerCard player={card} size="md" />
                                        {index < revealedCount && (
                                            <div className={`
                        absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold
                        ${isNew ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-200'}
                      `}>
                                                {isNew ? '✨ NEW' : '🔄 DUP'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-4">
                            {shopState === 'revealing' && (
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

                            {shopState === 'complete' && packResult && (
                                <div className="text-center">
                                    <div className="mb-4 space-y-2">
                                        <div className="text-red-400 text-lg">-{packResult.pointsSpent} spent</div>
                                        {packResult.newCards.length > 0 && (
                                            <div className="text-green-400 text-lg font-bold">
                                                +{packResult.newCards.length} new card{packResult.newCards.length > 1 ? 's' : ''}!
                                            </div>
                                        )}
                                        {packResult.pointsEarned > 0 && (
                                            <div className="text-amber-400 text-lg font-bold">
                                                +{packResult.pointsEarned} pts from duplicates
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4 justify-center">
                                        <button
                                            onClick={backToShop}
                                            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white hover:scale-105 transition-transform"
                                        >
                                            Buy More
                                        </button>
                                        <Link
                                            href="/inventory"
                                            className="px-8 py-3 bg-gray-700 rounded-xl font-bold text-white hover:bg-gray-600 transition-colors"
                                        >
                                            View Collection
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Quick links */}
                {shopState === 'browsing' && (
                    <div className="mt-12 text-center space-x-6">
                        <Link href="/open-pack" className="text-amber-400 hover:text-amber-300">
                            🎁 Free Daily Packs →
                        </Link>
                        <Link href="/inventory" className="text-gray-400 hover:text-white">
                            📦 View Inventory →
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
