'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { createGame, joinGame } from '@/lib/gameService';
import { GameMode } from '@/types/gameTypes';
import Link from 'next/link';

export default function BattlePage() {
    return (
        <ProtectedRoute>
            <BattleContent />
        </ProtectedRoute>
    );
}

function BattleContent() {
    const { user } = useAuth();
    const router = useRouter();
    const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
    const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('classic');
    const [gameCode, setGameCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdCode, setCreatedCode] = useState('');

    const handleCreateGame = async () => {
        if (!user) return;
        setLoading(true);
        setError('');

        try {
            const displayName = user.email?.split('@')[0] || 'Player';
            const { gameId, code } = await createGame(user.uid, displayName, selectedGameMode);
            setCreatedCode(code);
            setMode('create');

            // Navigate to game room
            router.push(`/battle/${gameId}`);
        } catch (err) {
            console.error('Error creating game:', err);
            setError('Failed to create game. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinGame = async () => {
        if (!user || !gameCode.trim()) return;
        setLoading(true);
        setError('');

        try {
            const displayName = user.email?.split('@')[0] || 'Player';
            const result = await joinGame(gameCode.trim(), user.uid, displayName);

            if (result.success && result.gameId) {
                router.push(`/battle/${result.gameId}`);
            } else {
                setError(result.error || 'Failed to join game');
            }
        } catch (err) {
            console.error('Error joining game:', err);
            setError('Failed to join game. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-black text-white mb-4">
                        ⚔️ Battle Arena
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Challenge a friend to a 1v1 card battle!
                    </p>
                </div>

                {/* Mode Selection */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 text-center">Choose Battle Mode</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Classic Mode */}
                        <button
                            onClick={() => setSelectedGameMode('classic')}
                            className={`
                                p-6 rounded-2xl border-2 transition-all text-left
                                ${selectedGameMode === 'classic'
                                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500 shadow-lg shadow-amber-500/20'
                                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}
                            `}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl">🎯</span>
                                <h3 className="text-xl font-bold text-white">Classic Mode</h3>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Choose 7 cards from your collection. Strategy is key!
                            </p>
                            {selectedGameMode === 'classic' && (
                                <div className="mt-3 text-amber-400 text-sm font-bold">✓ Selected</div>
                            )}
                        </button>

                        {/* Draft Mode */}
                        <button
                            onClick={() => setSelectedGameMode('draft')}
                            className={`
                                p-6 rounded-2xl border-2 transition-all text-left
                                ${selectedGameMode === 'draft'
                                    ? 'bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-500 shadow-lg shadow-purple-500/20'
                                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}
                            `}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl">🎲</span>
                                <h3 className="text-xl font-bold text-white">Draft Mode</h3>
                            </div>
                            <p className="text-gray-400 text-sm">
                                7 random cards are assigned. Pure luck and skill!
                            </p>
                            {selectedGameMode === 'draft' && (
                                <div className="mt-3 text-purple-400 text-sm font-bold">✓ Selected</div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Game Rules based on mode */}
                <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">
                        📋 {selectedGameMode === 'classic' ? 'Classic' : 'Draft'} Mode Rules
                    </h2>
                    <ul className="space-y-2 text-gray-300">
                        <li className="flex items-center gap-2">
                            <span className="text-amber-400">1.</span>
                            {selectedGameMode === 'classic'
                                ? 'Each player selects 7 cards from their collection'
                                : '7 random cards are assigned to each player'}
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-amber-400">2.</span>
                            Battle in 7 rounds - one card per round
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-amber-400">3.</span>
                            Players alternate choosing which stat to compare
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-amber-400">4.</span>
                            Higher stat wins the round!
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-green-400">🏆</span>
                            Winner gets <span className="text-amber-400 font-bold">200 points</span>!
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Create Game */}
                    <button
                        onClick={handleCreateGame}
                        disabled={loading}
                        className={`
                            ${selectedGameMode === 'classic'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400/50 hover:shadow-green-500/30'
                                : 'bg-gradient-to-r from-purple-500 to-pink-600 border-purple-400/50 hover:shadow-purple-500/30'}
                            rounded-2xl p-8 text-center
                            border-2
                            hover:scale-105 hover:shadow-2xl
                            transition-all duration-300
                            ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                    >
                        <div className="text-5xl mb-4">{selectedGameMode === 'classic' ? '🎮' : '🎲'}</div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                            Create {selectedGameMode === 'classic' ? 'Classic' : 'Draft'} Game
                        </h3>
                        <p className="text-white/80">
                            Start a new battle and invite a friend
                        </p>
                    </button>

                    {/* Join Game */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-center border-2 border-blue-400/50">
                        <div className="text-5xl mb-4">🎯</div>
                        <h3 className="text-2xl font-bold text-white mb-4">Join Game</h3>

                        <input
                            type="text"
                            value={gameCode}
                            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                            placeholder="Enter 6-letter code"
                            maxLength={6}
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center text-xl font-mono tracking-widest placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 mb-4"
                        />

                        <button
                            onClick={handleJoinGame}
                            disabled={loading || gameCode.length !== 6}
                            className={`
                                w-full py-3 rounded-xl font-bold text-white
                                ${gameCode.length === 6
                                    ? 'bg-white/20 hover:bg-white/30'
                                    : 'bg-white/10 cursor-not-allowed opacity-50'}
                                transition-colors
                            `}
                        >
                            {loading ? 'Joining...' : 'Join Battle'}
                        </button>
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center">
                        {error}
                    </div>
                )}

                {/* Back to home */}
                <div className="mt-8 text-center">
                    <Link
                        href="/"
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </main>
    );
}

