// Game types for multiplayer battles

import { Player } from './player';

// Game mode types
export type GameMode = 'classic' | 'draft';

// Player state within a game
export interface GamePlayer {
    odId: string;
    odisplayName: string;
    cards: string[]; // Card IDs selected for battle
    playedCards: string[]; // Cards already played
    ready: boolean;
    connected: boolean;
    lastSeen: number;
}

// Result of a single round
export interface RoundResult {
    roundNumber: number;
    player1Card: string;
    player2Card: string;
    stat: StatType;
    player1Value: number;
    player2Value: number;
    winner: 'player1' | 'player2' | 'tie';
}

// Game room state
export interface GameRoom {
    id: string;
    code: string;
    status: GameStatus;
    gameMode: GameMode; // 'classic' = user picks cards, 'draft' = random cards
    player1: GamePlayer;
    player2: GamePlayer | null;
    currentRound: number;
    currentTurn: 'player1' | 'player2';
    turnStartTime: number;
    turnDeadline: number;
    rounds: RoundResult[];
    winner: 'player1' | 'player2' | null;
    createdAt: number;
    updatedAt: number;
}

// Game status phases
export type GameStatus =
    | 'waiting'    // Waiting for player 2 to join
    | 'selecting'  // Both players selecting 6 cards
    | 'playing'    // Active battle
    | 'finished';  // Game over

// Stats that can be compared
export type StatType = 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical';

// Game constants
export const GAME_CONSTANTS = {
    CARDS_PER_GAME: 7,
    TURN_TIME_SECONDS: 60,
    WINNER_POINTS: 200,
    CODE_LENGTH: 6,
    DISCONNECT_TIMEOUT_MS: 30000, // 30 seconds
} as const;

// Stat display labels
export const STAT_LABELS: Record<StatType, string> = {
    pace: 'PAC',
    shooting: 'SHO',
    passing: 'PAS',
    dribbling: 'DRI',
    defending: 'DEF',
    physical: 'PHY',
};

// Generate random game code
export function generateGameCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
    let code = '';
    for (let i = 0; i < GAME_CONSTANTS.CODE_LENGTH; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
