'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { getUserData, getInventoryCards, UserData, getRemainingPacks } from '@/lib/userService';
import { getAllPlayers } from '@/lib/packOpening';
import { Player } from '@/types/player';
import PlayerCard from '@/components/PlayerCard';
import Link from 'next/link';

type FilterRarity = 'all' | 'icon' | 'legendary' | 'epic' | 'rare' | 'common';

export default function InventoryPage() {
    return (
        <ProtectedRoute>
            <InventoryContent />
        </ProtectedRoute>
    );
}

function InventoryContent() {
    const { user } = useAuth();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [cards, setCards] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterRarity>('all');
    const [selectedCard, setSelectedCard] = useState<Player | null>(null);

    // Get all players (current + legends)
    const allPlayers = getAllPlayers();

    // Load user data and cards
    useEffect(() => {
        async function loadData() {
            if (!user) return;
            try {
                const data = await getUserData(user.uid);
                setUserData(data);

                // Get full player data for inventory (now includes legends)
                const inventoryCards = getInventoryCards(data.inventory, allPlayers);
                setCards(inventoryCards);
            } catch (err) {
                console.error('Error loading inventory:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user, allPlayers]);

    // Filter cards
    const filteredCards = filter === 'all'
        ? cards
        : cards.filter(c => c.rarity === filter);

    // Count by rarity (now includes icons)
    const rarityCounts = {
        icon: cards.filter(c => c.rarity === 'icon').length,
        legendary: cards.filter(c => c.rarity === 'legendary').length,
        epic: cards.filter(c => c.rarity === 'epic').length,
        rare: cards.filter(c => c.rarity === 'rare').length,
        common: cards.filter(c => c.rarity === 'common').length,
    };

    const totalPlayers = allPlayers.length;
    const collectionProgress = Math.round((cards.length / totalPlayers) * 100);

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-bounce mb-4">📦</div>
                    <p className="text-gray-400">Loading collection...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2">
                            📦 My Collection
                        </h1>
                        <p className="text-gray-400">
                            {cards.length} / {totalPlayers} cards ({collectionProgress}% complete)
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4">
                        <StatBox label="Points" value={userData?.points || 0} color="text-amber-400" />
                        <StatBox label="Packs Today" value={userData ? getRemainingPacks(userData) : 0} color="text-green-400" />
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mb-8">
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500"
                            style={{ width: `${collectionProgress}%` }}
                        />
                    </div>
                </div>

                {/* Rarity filter */}
                <div className="flex flex-wrap gap-2 mb-8">
                    <FilterButton
                        active={filter === 'all'}
                        onClick={() => setFilter('all')}
                        count={cards.length}
                    >
                        All
                    </FilterButton>
                    <FilterButton
                        active={filter === 'icon'}
                        onClick={() => setFilter('icon')}
                        count={rarityCounts.icon}
                        color="text-amber-400"
                    >
                        👑 Icons
                    </FilterButton>
                    <FilterButton
                        active={filter === 'legendary'}
                        onClick={() => setFilter('legendary')}
                        count={rarityCounts.legendary}
                        color="text-yellow-400"
                    >
                        ⭐ Legendary
                    </FilterButton>
                    <FilterButton
                        active={filter === 'epic'}
                        onClick={() => setFilter('epic')}
                        count={rarityCounts.epic}
                        color="text-purple-400"
                    >
                        💜 Epic
                    </FilterButton>
                    <FilterButton
                        active={filter === 'rare'}
                        onClick={() => setFilter('rare')}
                        count={rarityCounts.rare}
                        color="text-blue-400"
                    >
                        💙 Rare
                    </FilterButton>
                    <FilterButton
                        active={filter === 'common'}
                        onClick={() => setFilter('common')}
                        count={rarityCounts.common}
                        color="text-gray-400"
                    >
                        🤍 Common
                    </FilterButton>
                </div>

                {/* Cards grid */}
                {filteredCards.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredCards.map((card, index) => (
                            <div
                                key={`${card.id}-${index}`}
                                onClick={() => setSelectedCard(card)}
                                className="cursor-pointer"
                            >
                                <PlayerCard player={card} size="sm" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-12 text-center">
                        <div className="text-6xl mb-4">📭</div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {filter === 'all' ? 'No Cards Yet' : `No ${filter} cards`}
                        </h2>
                        <p className="text-gray-400 mb-6">
                            {filter === 'all'
                                ? 'Open packs to start building your collection!'
                                : 'Keep opening packs to find more cards!'
                            }
                        </p>
                        <Link
                            href="/open-pack"
                            className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white hover:scale-105 transition-transform"
                        >
                            🎁 Open Pack
                        </Link>
                    </div>
                )}

                {/* Card detail modal */}
                {selectedCard && (
                    <div
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedCard(null)}
                    >
                        <div
                            className="relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <PlayerCard player={selectedCard} size="lg" />
                            <button
                                onClick={() => setSelectedCard(null)}
                                className="absolute -top-4 -right-4 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>

                            {/* Full stats */}
                            <div className="mt-4 bg-gray-800/80 rounded-xl p-4 text-center">
                                <h3 className="text-lg font-bold text-white mb-2">{selectedCard.fullName}</h3>
                                <p className="text-gray-400 text-sm">{selectedCard.club}</p>
                                <p className="text-gray-500 text-sm">{selectedCard.nationality}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

function StatBox({ label, value, color = "text-white" }: { label: string; value: number; color?: string }) {
    return (
        <div className="bg-gray-800/50 rounded-xl px-4 py-3 border border-gray-700 text-center min-w-[80px]">
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-gray-400 text-xs">{label}</div>
        </div>
    );
}

function FilterButton({
    active,
    onClick,
    children,
    count,
    color = "text-white"
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    count: number;
    color?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`
        px-4 py-2 rounded-lg font-medium transition-all
        ${active
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }
      `}
        >
            <span className={active ? color : ''}>{children}</span>
            <span className="ml-2 text-sm opacity-60">({count})</span>
        </button>
    );
}
