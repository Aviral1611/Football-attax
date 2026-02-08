'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { getUserData, getInventoryCards, UserData } from '@/lib/userService';
import { subscribeToGame, selectCards, playCard, forfeitGame } from '@/lib/gameService';
import { getAllPlayers } from '@/lib/packOpening';
import { GameRoom, StatType, STAT_LABELS, GAME_CONSTANTS } from '@/types/gameTypes';
import { Player } from '@/types/player';
import PlayerCard from '@/components/PlayerCard';
import Link from 'next/link';

export default function GameRoomPage() {
    return (
        <ProtectedRoute>
            <GameRoomContent />
        </ProtectedRoute>
    );
}

function GameRoomContent() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const gameId = params.gameId as string;

    const [game, setGame] = useState<GameRoom | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [inventoryCards, setInventoryCards] = useState<Player[]>([]);
    const [selectedCards, setSelectedCards] = useState<string[]>([]);
    const [selectedStat, setSelectedStat] = useState<StatType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);

    const allPlayers = getAllPlayers();

    // Determine if current user is player 1 or 2
    const isPlayer1 = game?.player1?.odId === user?.uid;
    const isPlayer2 = game?.player2?.odId === user?.uid;
    const playerKey = isPlayer1 ? 'player1' : 'player2';
    const myPlayer = isPlayer1 ? game?.player1 : game?.player2;
    const opponent = isPlayer1 ? game?.player2 : game?.player1;

    // Load user inventory
    useEffect(() => {
        async function loadData() {
            if (!user) return;
            try {
                const data = await getUserData(user.uid);
                setUserData(data);
                const cards = getInventoryCards(data.inventory, allPlayers);
                setInventoryCards(cards);
            } catch (err) {
                console.error('Error loading user data:', err);
            }
        }
        loadData();
    }, [user, allPlayers]);

    // Subscribe to game updates
    useEffect(() => {
        if (!gameId) return;

        const unsubscribe = subscribeToGame(gameId, (updatedGame) => {
            setGame(updatedGame);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [gameId]);

    // Timer countdown
    useEffect(() => {
        if (!game || game.status === 'finished' || game.status === 'waiting') {
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((game.turnDeadline - now) / 1000));
            setTimeLeft(remaining);

            // Auto-forfeit on timeout (only for current player)
            if (remaining === 0 && user) {
                const isMyTurn =
                    (game.status === 'selecting' && !myPlayer?.ready) ||
                    (game.status === 'playing' && isCurrentPlayerTurn());

                if (isMyTurn) {
                    forfeitGame(gameId, user.uid);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [game, user, gameId, myPlayer]);

    // Check if it's current user's turn
    const isCurrentPlayerTurn = useCallback(() => {
        if (!game || game.status !== 'playing') return false;

        const currentRound = game.currentRound;
        const existingRound = game.rounds?.find(r => r.roundNumber === currentRound);

        if (!existingRound) {
            // First play of round - stat chooser's turn
            const isStatChooser = (currentRound % 2 === 1 && isPlayer1) || (currentRound % 2 === 0 && isPlayer2);
            return isStatChooser;
        } else {
            // Second play - responder's turn
            const isResponder = (currentRound % 2 === 1 && isPlayer2) || (currentRound % 2 === 0 && isPlayer1);
            return isResponder;
        }
    }, [game, isPlayer1, isPlayer2]);

    // Handle card selection for lineup
    const handleSelectLineupCard = (cardId: string) => {
        if (selectedCards.includes(cardId)) {
            setSelectedCards(prev => prev.filter(id => id !== cardId));
        } else if (selectedCards.length < GAME_CONSTANTS.CARDS_PER_GAME) {
            setSelectedCards(prev => [...prev, cardId]);
        }
    };

    // Submit selected cards
    const handleSubmitCards = async () => {
        if (!user || selectedCards.length !== GAME_CONSTANTS.CARDS_PER_GAME) return;

        setError('');
        try {
            const result = await selectCards(gameId, user.uid, selectedCards);
            if (!result.success) {
                setError(result.error || 'Failed to submit cards');
            }
        } catch (err) {
            console.error('Error submitting cards:', err);
            setError('Failed to submit cards');
        }
    };

    // Play a card in battle
    const handlePlayCard = async (cardId: string) => {
        if (!user) return;

        const needsStat = isCurrentPlayerTurn() && !game?.rounds?.find(r => r.roundNumber === game?.currentRound);

        if (needsStat && !selectedStat) {
            setError('Please select a stat first');
            return;
        }

        setError('');
        try {
            const result = await playCard(gameId, user.uid, cardId, selectedStat || undefined);
            if (!result.success) {
                setError(result.error || 'Failed to play card');
            }
            setSelectedStat(null);
        } catch (err) {
            console.error('Error playing card:', err);
            setError('Failed to play card');
        }
    };

    // Get available cards (not yet played)
    const getAvailableCards = () => {
        if (!myPlayer) return [];
        const playedIds = myPlayer.playedCards || [];
        return myPlayer.cards.filter(id => !playedIds.includes(id));
    };

    // Get card by ID
    const getCardById = (cardId: string) => {
        return allPlayers.find(p => p.id === cardId);
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-pulse mb-4">⚔️</div>
                    <p className="text-gray-400">Loading battle...</p>
                </div>
            </main>
        );
    }

    if (!game) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <p className="text-white text-xl mb-4">Game not found</p>
                    <Link href="/battle" className="text-amber-400 hover:underline">
                        ← Back to Battle Hub
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Game Status Header */}
                <div className="bg-gray-800/50 rounded-xl p-4 mb-6 flex justify-between items-center border border-gray-700">
                    <div>
                        <span className="text-gray-400 text-sm">Room Code:</span>
                        <span className="ml-2 font-mono text-xl text-amber-400">{game.code}</span>
                    </div>

                    {/* Timer */}
                    {(game.status === 'selecting' || game.status === 'playing') && (
                        <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            ⏱ {timeLeft}s
                        </div>
                    )}

                    <div className="text-right">
                        <span className="text-gray-400 text-sm">Status:</span>
                        <span className={`ml-2 font-bold ${game.status === 'waiting' ? 'text-yellow-400' :
                                game.status === 'selecting' ? 'text-blue-400' :
                                    game.status === 'playing' ? 'text-green-400' :
                                        'text-purple-400'
                            }`}>
                            {game.status.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* WAITING PHASE */}
                {game.status === 'waiting' && (
                    <WaitingPhase code={game.code} />
                )}

                {/* CARD SELECTION PHASE */}
                {game.status === 'selecting' && (
                    <SelectionPhase
                        inventoryCards={inventoryCards}
                        selectedCards={selectedCards}
                        onSelectCard={handleSelectLineupCard}
                        onSubmit={handleSubmitCards}
                        isReady={myPlayer?.ready || false}
                        opponentReady={opponent?.ready || false}
                        error={error}
                    />
                )}

                {/* BATTLE PHASE */}
                {game.status === 'playing' && (
                    <BattlePhase
                        game={game}
                        isPlayer1={isPlayer1}
                        isMyTurn={isCurrentPlayerTurn()}
                        availableCards={getAvailableCards().map(id => getCardById(id)).filter((c): c is Player => c !== undefined)}
                        selectedStat={selectedStat}
                        onSelectStat={setSelectedStat}
                        onPlayCard={handlePlayCard}
                        allPlayers={allPlayers}
                        error={error}
                    />
                )}

                {/* FINISHED PHASE */}
                {game.status === 'finished' && (
                    <FinishedPhase
                        game={game}
                        isPlayer1={isPlayer1}
                        allPlayers={allPlayers}
                    />
                )}
            </div>
        </main>
    );
}

// Waiting Phase Component
function WaitingPhase({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="text-center py-20">
            <div className="text-8xl mb-8 animate-bounce">⏳</div>
            <h2 className="text-3xl font-bold text-white mb-4">Waiting for opponent...</h2>
            <p className="text-gray-400 mb-8">Share this code with your friend:</p>

            <div className="inline-flex items-center gap-4 bg-gray-800 rounded-xl px-6 py-4 border-2 border-amber-500/50">
                <span className="font-mono text-4xl tracking-widest text-amber-400">{code}</span>
                <button
                    onClick={copyCode}
                    className="px-4 py-2 bg-amber-500 rounded-lg font-bold text-black hover:bg-amber-400 transition-colors"
                >
                    {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
            </div>
        </div>
    );
}

// Selection Phase Component
function SelectionPhase({
    inventoryCards,
    selectedCards,
    onSelectCard,
    onSubmit,
    isReady,
    opponentReady,
    error
}: {
    inventoryCards: Player[];
    selectedCards: string[];
    onSelectCard: (id: string) => void;
    onSubmit: () => void;
    isReady: boolean;
    opponentReady: boolean;
    error: string;
}) {
    return (
        <div>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {isReady ? '✅ Cards Locked In!' : `Select ${GAME_CONSTANTS.CARDS_PER_GAME} Cards for Battle`}
                </h2>
                <p className="text-gray-400">
                    {isReady
                        ? (opponentReady ? 'Starting battle...' : 'Waiting for opponent to select cards...')
                        : `Selected: ${selectedCards.length}/${GAME_CONSTANTS.CARDS_PER_GAME}`
                    }
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center">
                    {error}
                </div>
            )}

            {!isReady && (
                <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6">
                        {inventoryCards.map(card => (
                            <div
                                key={card.id}
                                onClick={() => onSelectCard(card.id)}
                                className={`cursor-pointer transition-all ${selectedCards.includes(card.id)
                                        ? 'ring-4 ring-green-500 scale-105'
                                        : selectedCards.length >= GAME_CONSTANTS.CARDS_PER_GAME
                                            ? 'opacity-40'
                                            : 'hover:scale-105'
                                    }`}
                            >
                                <PlayerCard player={card} size="sm" />
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <button
                            onClick={onSubmit}
                            disabled={selectedCards.length !== GAME_CONSTANTS.CARDS_PER_GAME}
                            className={`
                                px-8 py-4 rounded-xl font-bold text-xl
                                ${selectedCards.length === GAME_CONSTANTS.CARDS_PER_GAME
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                                transition-all
                            `}
                        >
                            🔒 Lock In Cards
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// Battle Phase Component
function BattlePhase({
    game,
    isPlayer1,
    isMyTurn,
    availableCards,
    selectedStat,
    onSelectStat,
    onPlayCard,
    allPlayers,
    error
}: {
    game: GameRoom;
    isPlayer1: boolean;
    isMyTurn: boolean;
    availableCards: Player[];
    selectedStat: StatType | null;
    onSelectStat: (stat: StatType) => void;
    onPlayCard: (cardId: string) => void;
    allPlayers: Player[];
    error: string;
}) {
    const currentRound = game.currentRound;
    const existingRound = game.rounds?.find(r => r.roundNumber === currentRound);
    const needsToChooseStat = isMyTurn && !existingRound;

    // Score
    const p1Wins = game.rounds?.filter(r => r.winner === 'player1').length || 0;
    const p2Wins = game.rounds?.filter(r => r.winner === 'player2').length || 0;
    const myWins = isPlayer1 ? p1Wins : p2Wins;
    const oppWins = isPlayer1 ? p2Wins : p1Wins;

    return (
        <div>
            {/* Round & Score */}
            <div className="flex justify-between items-center mb-6">
                <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{myWins}</div>
                    <div className="text-gray-400 text-sm">You</div>
                </div>

                <div className="text-center">
                    <div className="text-gray-400 text-sm mb-1">Round</div>
                    <div className="text-4xl font-black text-white">{currentRound}/6</div>
                </div>

                <div className="text-center">
                    <div className="text-3xl font-bold text-red-400">{oppWins}</div>
                    <div className="text-gray-400 text-sm">Opponent</div>
                </div>
            </div>

            {/* Turn indicator */}
            <div className={`text-center mb-4 py-2 rounded-lg ${isMyTurn ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {isMyTurn ? '🎯 Your turn!' : '⏳ Waiting for opponent...'}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center">
                    {error}
                </div>
            )}

            {/* Stat selector (if choosing stat) */}
            {needsToChooseStat && (
                <div className="mb-6">
                    <p className="text-center text-white mb-3">Choose a stat to compare:</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                        {(['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as StatType[]).map(stat => (
                            <button
                                key={stat}
                                onClick={() => onSelectStat(stat)}
                                className={`
                                    px-4 py-2 rounded-lg font-bold transition-all
                                    ${selectedStat === stat
                                        ? 'bg-amber-500 text-black scale-110'
                                        : 'bg-gray-700 text-white hover:bg-gray-600'}
                                `}
                            >
                                {STAT_LABELS[stat]}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Show chosen stat for responder */}
            {existingRound && (
                <div className="text-center mb-4">
                    <span className="text-gray-400">Comparing:</span>
                    <span className="ml-2 px-3 py-1 bg-amber-500/20 rounded-lg text-amber-400 font-bold">
                        {STAT_LABELS[existingRound.stat]}
                    </span>
                </div>
            )}

            {/* Available cards */}
            {isMyTurn && (
                <div>
                    <p className="text-center text-gray-400 mb-4">Select a card to play:</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        {availableCards.map(card => (
                            <div
                                key={card.id}
                                onClick={() => onPlayCard(card.id)}
                                className="cursor-pointer hover:scale-110 transition-transform"
                            >
                                <PlayerCard player={card} size="sm" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Previous rounds */}
            {game.rounds && game.rounds.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold text-white mb-4">Previous Rounds</h3>
                    <div className="space-y-2">
                        {game.rounds.filter(r => r.winner !== 'tie' || r.player2Card).map(round => {
                            const p1Card = allPlayers.find(p => p.id === round.player1Card);
                            const p2Card = allPlayers.find(p => p.id === round.player2Card);
                            const myCard = isPlayer1 ? p1Card : p2Card;
                            const oppCard = isPlayer1 ? p2Card : p1Card;
                            const myValue = isPlayer1 ? round.player1Value : round.player2Value;
                            const oppValue = isPlayer1 ? round.player2Value : round.player1Value;
                            const iWon = (isPlayer1 && round.winner === 'player1') || (!isPlayer1 && round.winner === 'player2');

                            return (
                                <div key={round.roundNumber} className={`
                                    flex items-center justify-between p-3 rounded-lg border
                                    ${iWon ? 'bg-green-500/10 border-green-500/30' : round.winner === 'tie' ? 'bg-gray-500/10 border-gray-500/30' : 'bg-red-500/10 border-red-500/30'}
                                `}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">R{round.roundNumber}</span>
                                        <span className="text-white">{myCard?.name || '?'}</span>
                                        <span className={`font-bold ${iWon ? 'text-green-400' : 'text-red-400'}`}>{myValue}</span>
                                    </div>
                                    <span className="text-amber-400 font-bold">{STAT_LABELS[round.stat]}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold ${iWon ? 'text-red-400' : 'text-green-400'}`}>{oppValue}</span>
                                        <span className="text-white">{oppCard?.name || '?'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// Finished Phase Component
function FinishedPhase({
    game,
    isPlayer1,
    allPlayers
}: {
    game: GameRoom;
    isPlayer1: boolean;
    allPlayers: Player[];
}) {
    const iWon = (isPlayer1 && game.winner === 'player1') || (!isPlayer1 && game.winner === 'player2');
    const isTie = game.winner === null;

    const p1Wins = game.rounds?.filter(r => r.winner === 'player1').length || 0;
    const p2Wins = game.rounds?.filter(r => r.winner === 'player2').length || 0;

    return (
        <div className="text-center py-12">
            <div className={`text-8xl mb-6 ${isTie ? '' : iWon ? 'animate-bounce' : ''}`}>
                {isTie ? '🤝' : iWon ? '🏆' : '😢'}
            </div>

            <h2 className={`text-4xl font-black mb-4 ${isTie ? 'text-gray-400' : iWon ? 'text-green-400' : 'text-red-400'}`}>
                {isTie ? 'It\'s a Tie!' : iWon ? 'Victory!' : 'Defeat'}
            </h2>

            {iWon && (
                <p className="text-2xl text-amber-400 mb-6">+{GAME_CONSTANTS.WINNER_POINTS} Points!</p>
            )}

            <div className="text-xl text-gray-400 mb-8">
                Final Score: <span className="text-green-400">{isPlayer1 ? p1Wins : p2Wins}</span> - <span className="text-red-400">{isPlayer1 ? p2Wins : p1Wins}</span>
            </div>

            <Link
                href="/battle"
                className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-xl text-white hover:scale-105 transition-transform"
            >
                Play Again
            </Link>
        </div>
    );
}
