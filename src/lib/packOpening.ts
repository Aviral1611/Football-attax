import { Player } from '@/types/player';
import playersData from '@/data/players.json';
import legendsData from '@/data/legends.json';

// Combine current players and legends into one pool
const allPlayers: Player[] = [
    ...(playersData as Player[]),
    ...(legendsData as Player[]),
];

// Pack Types with their drop rates and prices (now including icon tier)
export const PACK_TYPES = {
    silver: {
        name: 'Silver Pack',
        emoji: '🥈',
        price: 100,
        color: 'from-gray-400 to-gray-500',
        borderColor: 'border-gray-400',
        dropRates: {
            icon: 0.001,       // 0.1%
            legendary: 0.005,  // 0.5%
            epic: 0.02,        // 2%
            rare: 0.10,        // 10%
            common: 0.874,     // 87.4%
        },
    },
    gold: {
        name: 'Gold Pack',
        emoji: '🥇',
        price: 200,
        color: 'from-yellow-500 to-amber-600',
        borderColor: 'border-yellow-500',
        dropRates: {
            icon: 0.005,       // 0.5%
            legendary: 0.01,   // 1%
            epic: 0.06,        // 6%
            rare: 0.18,        // 18%
            common: 0.745,     // 74.5%
        },
    },
    rare: {
        name: 'Rare Pack',
        emoji: '💎',
        price: 300,
        color: 'from-blue-500 to-blue-700',
        borderColor: 'border-blue-500',
        dropRates: {
            icon: 0.015,       // 1.5%
            legendary: 0.03,   // 3%
            epic: 0.12,        // 12%
            rare: 0.35,        // 35%
            common: 0.485,     // 48.5%
        },
    },
    epic: {
        name: 'Epic Pack',
        emoji: '👑',
        price: 500,
        color: 'from-purple-500 to-purple-700',
        borderColor: 'border-purple-500',
        dropRates: {
            icon: 0.04,        // 4%
            legendary: 0.08,   // 8%
            epic: 0.25,        // 25%
            rare: 0.40,        // 40%
            common: 0.23,      // 23%
        },
    },
} as const;

export type PackType = keyof typeof PACK_TYPES;
export type Rarity = 'icon' | 'legendary' | 'epic' | 'rare' | 'common';

// Points earned from duplicate cards
export const DUPLICATE_POINTS = {
    icon: 500,
    legendary: 300,
    epic: 80,
    rare: 20,
    common: 5,
} as const;

// Game constants
export const CARDS_PER_PACK = 5;
export const FREE_PACKS_PER_DAY = 2;
export const STARTING_POINTS = 1000;
export const FREE_PACK_TYPE: PackType = 'gold'; // Free daily packs are Gold

/**
 * Roll a random rarity based on pack type drop rates
 */
function rollRarity(packType: PackType): Rarity {
    const rates = PACK_TYPES[packType].dropRates;
    const roll = Math.random();
    let cumulative = 0;

    for (const [rarity, rate] of Object.entries(rates)) {
        cumulative += rate;
        if (roll < cumulative) {
            return rarity as Rarity;
        }
    }

    return 'common'; // Fallback
}

/**
 * Get a random player of a specific rarity
 */
function getRandomPlayerOfRarity(rarity: Rarity, players: Player[]): Player {
    const rarityPlayers = players.filter(p => p.rarity === rarity);

    if (rarityPlayers.length === 0) {
        // Fallback: get any player (shouldn't happen but just in case)
        console.warn(`No players found for rarity: ${rarity}, falling back to random`);
        return players[Math.floor(Math.random() * players.length)];
    }

    const randomIndex = Math.floor(Math.random() * rarityPlayers.length);
    return rarityPlayers[randomIndex];
}

/**
 * Open a pack of specified type and get 5 random cards
 */
export function openPack(packType: PackType = 'gold'): Player[] {
    const pack: Player[] = [];

    for (let i = 0; i < CARDS_PER_PACK; i++) {
        const rarity = rollRarity(packType);
        const player = getRandomPlayerOfRarity(rarity, allPlayers);
        pack.push({ ...player }); // Clone to avoid reference issues
    }

    return pack;
}

/**
 * Get pack info for display
 */
export function getPackInfo(packType: PackType) {
    return PACK_TYPES[packType];
}

/**
 * Calculate points from a pack (if all cards are duplicates)
 */
export function calculatePackPoints(pack: Player[]): number {
    return pack.reduce((total, card) => {
        return total + DUPLICATE_POINTS[card.rarity];
    }, 0);
}

/**
 * Check if user can afford a pack
 */
export function canAffordPack(points: number, packType: PackType): boolean {
    return points >= PACK_TYPES[packType].price;
}

/**
 * Get all players (current + legends)
 */
export function getAllPlayers(): Player[] {
    return allPlayers;
}

/**
 * Get player count stats
 */
export function getPlayerStats() {
    return {
        total: allPlayers.length,
        icons: allPlayers.filter(p => p.rarity === 'icon').length,
        legendary: allPlayers.filter(p => p.rarity === 'legendary').length,
        epic: allPlayers.filter(p => p.rarity === 'epic').length,
        rare: allPlayers.filter(p => p.rarity === 'rare').length,
        common: allPlayers.filter(p => p.rarity === 'common').length,
    };
}
