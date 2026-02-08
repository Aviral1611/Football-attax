// Game service for multiplayer battles using Firebase Realtime Database

import { rtdb } from './firebase';
import {
    ref,
    set,
    get,
    update,
    onValue,
    off,
    remove,
    push
} from 'firebase/database';
import {
    GameRoom,
    GamePlayer,
    RoundResult,
    StatType,
    GAME_CONSTANTS,
    generateGameCode,
    GameStatus
} from '@/types/gameTypes';
import { Player } from '@/types/player';
import { getAllPlayers } from './packOpening';
import { getUserData } from './userService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Create a new game room
export async function createGame(userId: string, displayName: string): Promise<{ gameId: string; code: string }> {
    const code = generateGameCode();
    const gameId = push(ref(rtdb, 'games')).key!;

    const now = Date.now();
    const gameRoom: GameRoom = {
        id: gameId,
        code,
        status: 'waiting',
        player1: {
            odId: userId,
            odisplayName: displayName,
            cards: [],
            playedCards: [],
            ready: false,
            connected: true,
            lastSeen: now,
        },
        player2: null,
        currentRound: 0,
        currentTurn: 'player1',
        turnStartTime: 0,
        turnDeadline: 0,
        rounds: [],
        winner: null,
        createdAt: now,
        updatedAt: now,
    };

    // Save game to database
    await set(ref(rtdb, `games/${gameId}`), gameRoom);

    // Create code lookup for joining
    await set(ref(rtdb, `gameCodes/${code}`), gameId);

    return { gameId, code };
}

// Join an existing game by code
export async function joinGame(
    code: string,
    userId: string,
    displayName: string
): Promise<{ success: boolean; gameId?: string; error?: string }> {
    // Look up game ID from code
    const codeRef = ref(rtdb, `gameCodes/${code.toUpperCase()}`);
    const codeSnapshot = await get(codeRef);

    if (!codeSnapshot.exists()) {
        return { success: false, error: 'Game not found. Check the code and try again.' };
    }

    const gameId = codeSnapshot.val();
    const gameRef = ref(rtdb, `games/${gameId}`);
    const gameSnapshot = await get(gameRef);

    if (!gameSnapshot.exists()) {
        return { success: false, error: 'Game no longer exists.' };
    }

    const game = gameSnapshot.val() as GameRoom;

    if (game.status !== 'waiting') {
        return { success: false, error: 'Game already in progress.' };
    }

    if (game.player1.odId === userId) {
        return { success: false, error: 'You cannot join your own game!' };
    }

    const now = Date.now();

    // Add player 2 and start card selection
    const player2Data: GamePlayer = {
        odId: userId,
        odisplayName: displayName,
        cards: [],
        playedCards: [],
        ready: false,
        connected: true,
        lastSeen: now,
    };

    await update(gameRef, {
        player2: player2Data,
        status: 'selecting',
        turnStartTime: now,
        turnDeadline: now + (GAME_CONSTANTS.TURN_TIME_SECONDS * 1000),
        updatedAt: now,
    });

    // Remove code lookup (game is now full)
    await remove(ref(rtdb, `gameCodes/${code.toUpperCase()}`));

    return { success: true, gameId };
}

// Select cards for battle
export async function selectCards(
    gameId: string,
    userId: string,
    cardIds: string[]
): Promise<{ success: boolean; error?: string }> {
    if (cardIds.length !== GAME_CONSTANTS.CARDS_PER_GAME) {
        return { success: false, error: `Must select exactly ${GAME_CONSTANTS.CARDS_PER_GAME} cards` };
    }

    const gameRef = ref(rtdb, `games/${gameId}`);
    const snapshot = await get(gameRef);

    if (!snapshot.exists()) {
        return { success: false, error: 'Game not found' };
    }

    const game = snapshot.val() as GameRoom;

    if (game.status !== 'selecting') {
        return { success: false, error: 'Not in card selection phase' };
    }

    const isPlayer1 = game.player1.odId === userId;
    const isPlayer2 = game.player2?.odId === userId;

    if (!isPlayer1 && !isPlayer2) {
        return { success: false, error: 'You are not in this game' };
    }

    const now = Date.now();

    // Use separate update paths to avoid Firebase path issues
    if (isPlayer1) {
        await update(ref(rtdb, `games/${gameId}/player1`), {
            cards: cardIds,
            ready: true,
        });
    } else {
        await update(ref(rtdb, `games/${gameId}/player2`), {
            cards: cardIds,
            ready: true,
        });
    }

    await update(gameRef, { updatedAt: now });

    // Check if both players are ready
    const updatedSnapshot = await get(gameRef);
    const updatedGame = updatedSnapshot.val() as GameRoom;

    if (updatedGame.player1.ready && updatedGame.player2?.ready) {
        // Both ready, start the game!
        await update(gameRef, {
            status: 'playing',
            currentRound: 1,
            currentTurn: 'player1',
            turnStartTime: now,
            turnDeadline: now + (GAME_CONSTANTS.TURN_TIME_SECONDS * 1000),
        });
    }

    return { success: true };
}

// Play a card in the current round
export async function playCard(
    gameId: string,
    userId: string,
    cardId: string,
    selectedStat?: StatType
): Promise<{ success: boolean; error?: string }> {
    const gameRef = ref(rtdb, `games/${gameId}`);
    const snapshot = await get(gameRef);

    if (!snapshot.exists()) {
        return { success: false, error: 'Game not found' };
    }

    const game = snapshot.val() as GameRoom;

    if (game.status !== 'playing') {
        return { success: false, error: 'Game is not in playing phase' };
    }

    const isPlayer1 = game.player1.odId === userId;
    const isPlayer2 = game.player2?.odId === userId;

    if (!isPlayer1 && !isPlayer2) {
        return { success: false, error: 'You are not in this game' };
    }

    const playerKey = isPlayer1 ? 'player1' : 'player2';
    const playerData = game[playerKey] as GamePlayer;
    const currentRound = game.currentRound;

    // Get current round data
    const roundsArray = game.rounds || [];
    const existingRound = roundsArray.find(r => r.roundNumber === currentRound);
    const allPlayers = getAllPlayers();

    const now = Date.now();

    if (!existingRound) {
        // First card of the round (by the stat chooser)
        const isStatChooser = (currentRound % 2 === 1 && isPlayer1) || (currentRound % 2 === 0 && isPlayer2);

        if (!isStatChooser) {
            return { success: false, error: 'Wait for opponent to play first' };
        }

        if (!selectedStat) {
            return { success: false, error: 'You must select a stat' };
        }

        const card = allPlayers.find(p => p.id === cardId);
        if (!card) {
            return { success: false, error: 'Card not found' };
        }

        const newRound: RoundResult = {
            roundNumber: currentRound,
            player1Card: isPlayer1 ? cardId : '',
            player2Card: isPlayer2 ? cardId : '',
            stat: selectedStat,
            player1Value: isPlayer1 ? card.stats[selectedStat] : 0,
            player2Value: isPlayer2 ? card.stats[selectedStat] : 0,
            winner: 'tie', // Will be determined when both play
        };

        const newRounds = [...roundsArray, newRound];
        const newPlayedCards = [...(playerData.playedCards || []), cardId];

        // Update using separate paths
        await update(ref(rtdb, `games/${gameId}/${playerKey}`), {
            playedCards: newPlayedCards,
        });

        await update(gameRef, {
            rounds: newRounds,
            turnStartTime: now,
            turnDeadline: now + (GAME_CONSTANTS.TURN_TIME_SECONDS * 1000),
            updatedAt: now,
        });

        return { success: true };
    } else {
        // Second card of the round (responder)
        const isResponder = (currentRound % 2 === 1 && isPlayer2) || (currentRound % 2 === 0 && isPlayer1);

        if (!isResponder) {
            return { success: false, error: 'Wait for your turn' };
        }

        const card = allPlayers.find(p => p.id === cardId);
        if (!card) {
            return { success: false, error: 'Card not found' };
        }

        const statValue = card.stats[existingRound.stat];
        const opponentValue = isPlayer1 ? existingRound.player2Value : existingRound.player1Value;

        // Determine round winner
        let winner: 'player1' | 'player2' | 'tie' = 'tie';
        if (isPlayer1) {
            if (statValue > opponentValue) winner = 'player1';
            else if (statValue < opponentValue) winner = 'player2';
        } else {
            if (statValue > opponentValue) winner = 'player2';
            else if (statValue < opponentValue) winner = 'player1';
        }

        // Update round
        const updatedRound: RoundResult = {
            ...existingRound,
            player1Card: isPlayer1 ? cardId : existingRound.player1Card,
            player2Card: isPlayer2 ? cardId : existingRound.player2Card,
            player1Value: isPlayer1 ? statValue : existingRound.player1Value,
            player2Value: isPlayer2 ? statValue : existingRound.player2Value,
            winner,
        };

        const newRounds = roundsArray.map(r =>
            r.roundNumber === currentRound ? updatedRound : r
        );

        // Check if game is over
        const isGameOver = currentRound >= GAME_CONSTANTS.CARDS_PER_GAME;

        let gameWinner: 'player1' | 'player2' | null = null;
        let newStatus: GameStatus = 'playing';

        if (isGameOver) {
            // Count round wins
            const p1Wins = newRounds.filter(r => r.winner === 'player1').length;
            const p2Wins = newRounds.filter(r => r.winner === 'player2').length;

            if (p1Wins > p2Wins) gameWinner = 'player1';
            else if (p2Wins > p1Wins) gameWinner = 'player2';
            // If tie, no winner

            newStatus = 'finished';
        }

        const newPlayedCards = [...(playerData.playedCards || []), cardId];

        // Update using separate paths
        await update(ref(rtdb, `games/${gameId}/${playerKey}`), {
            playedCards: newPlayedCards,
        });

        await update(gameRef, {
            rounds: newRounds,
            currentRound: isGameOver ? currentRound : currentRound + 1,
            currentTurn: currentRound % 2 === 0 ? 'player1' : 'player2',
            status: newStatus,
            winner: gameWinner,
            turnStartTime: isGameOver ? 0 : now,
            turnDeadline: isGameOver ? 0 : now + (GAME_CONSTANTS.TURN_TIME_SECONDS * 1000),
            updatedAt: now,
        });

        // Points are now claimed by winner's client via claimWinnerPoints

        return { success: true };
    }
}

// Claim points as the winner (called by winner's client)
export async function claimWinnerPoints(
    gameId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const gameRef = ref(rtdb, `games/${gameId}`);
        const snapshot = await get(gameRef);

        if (!snapshot.exists()) {
            return { success: false, error: 'Game not found' };
        }

        const game = snapshot.val() as GameRoom;

        // Check if game is finished
        if (game.status !== 'finished') {
            return { success: false, error: 'Game is not finished' };
        }

        // Check if this user is the winner
        const isPlayer1 = game.player1?.odId === userId;
        const isPlayer2 = game.player2?.odId === userId;

        if (!isPlayer1 && !isPlayer2) {
            return { success: false, error: 'You are not in this game' };
        }

        const isWinner = (isPlayer1 && game.winner === 'player1') ||
            (isPlayer2 && game.winner === 'player2');

        if (!isWinner) {
            return { success: false, error: 'You did not win this game' };
        }

        // Check if points were already claimed
        const pointsClaimedKey = isPlayer1 ? 'player1PointsClaimed' : 'player2PointsClaimed';
        if ((game as any)[pointsClaimedKey]) {
            return { success: false, error: 'Points already claimed' };
        }

        // Get user data and add points
        const userData = await getUserData(userId);
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            points: userData.points + GAME_CONSTANTS.WINNER_POINTS,
        });

        // Mark points as claimed
        await update(gameRef, {
            [pointsClaimedKey]: true,
        });

        return { success: true };
    } catch (error) {
        console.error('Error claiming points:', error);
        return { success: false, error: 'Failed to claim points' };
    }
}

// Subscribe to game updates
export function subscribeToGame(
    gameId: string,
    callback: (game: GameRoom | null) => void
): () => void {
    const gameRef = ref(rtdb, `games/${gameId}`);

    onValue(gameRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val() as GameRoom);
        } else {
            callback(null);
        }
    });

    // Return unsubscribe function
    return () => off(gameRef);
}

// Update player connection status
export async function updateConnectionStatus(
    gameId: string,
    oduserId: string,
    connected: boolean
): Promise<void> {
    const gameRef = ref(rtdb, `games/${gameId}`);
    const snapshot = await get(gameRef);

    if (!snapshot.exists()) return;

    const game = snapshot.val() as GameRoom;
    const isPlayer1 = game.player1?.odId === oduserId;
    const isPlayer2 = game.player2?.odId === oduserId;

    if (!isPlayer1 && !isPlayer2) return;

    const playerKey = isPlayer1 ? 'player1' : 'player2';
    const now = Date.now();

    await update(ref(rtdb, `games/${gameId}/${playerKey}`), {
        connected: connected,
        lastSeen: now,
    });

    await update(gameRef, { updatedAt: now });
}

// Forfeit game (disconnect or timeout)
export async function forfeitGame(
    gameId: string,
    loserId: string
): Promise<void> {
    const gameRef = ref(rtdb, `games/${gameId}`);
    const snapshot = await get(gameRef);

    if (!snapshot.exists()) return;

    const game = snapshot.val() as GameRoom;

    if (game.status === 'finished') return;

    const isPlayer1Loser = game.player1?.odId === loserId;
    const gameWinner = isPlayer1Loser ? 'player2' : 'player1';
    const winnerId = isPlayer1Loser ? game.player2?.odId : game.player1?.odId;

    await update(gameRef, {
        status: 'finished',
        winner: gameWinner,
        updatedAt: Date.now(),
    });

    // Points are now claimed by winner's client via claimWinnerPoints
}

// Get game by ID
export async function getGame(gameId: string): Promise<GameRoom | null> {
    const gameRef = ref(rtdb, `games/${gameId}`);
    const snapshot = await get(gameRef);

    if (snapshot.exists()) {
        return snapshot.val() as GameRoom;
    }
    return null;
}
