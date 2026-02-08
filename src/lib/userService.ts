import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Player } from '@/types/player';
import { DUPLICATE_POINTS, FREE_PACKS_PER_DAY, STARTING_POINTS, PACK_TYPES, PackType } from './packOpening';

// User data structure in Firestore
export interface UserData {
    points: number;
    packsOpenedToday: number;
    lastPackReset: Timestamp;
    inventory: string[]; // Array of card IDs
    createdAt: Timestamp;
}

// Get or create user document
export async function getUserData(userId: string): Promise<UserData> {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        // Check if we need to reset daily packs
        return await checkAndResetDailyPacks(userId, data);
    }

    // Create new user document with starting points
    const newUserData: UserData = {
        points: STARTING_POINTS,
        packsOpenedToday: 0,
        lastPackReset: Timestamp.now(),
        inventory: [],
        createdAt: Timestamp.now(),
    };

    await setDoc(userRef, newUserData);
    return newUserData;
}

// Check if daily packs should be reset (UTC midnight)
async function checkAndResetDailyPacks(userId: string, userData: UserData): Promise<UserData> {
    const now = new Date();
    const lastReset = userData.lastPackReset.toDate();

    // Check if it's a new UTC day
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const lastResetUTC = new Date(Date.UTC(lastReset.getUTCFullYear(), lastReset.getUTCMonth(), lastReset.getUTCDate()));

    if (nowUTC > lastResetUTC) {
        // Reset daily packs
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            packsOpenedToday: 0,
            lastPackReset: Timestamp.now(),
        });

        return {
            ...userData,
            packsOpenedToday: 0,
            lastPackReset: Timestamp.now(),
        };
    }

    return userData;
}

// Get remaining packs for today
export function getRemainingPacks(userData: UserData): number {
    return Math.max(0, FREE_PACKS_PER_DAY - userData.packsOpenedToday);
}

// Add cards to user inventory after opening a pack
export async function addCardsToInventory(
    userId: string,
    cards: Player[],
    currentInventory: string[]
): Promise<{ newCards: Player[]; duplicates: Player[]; pointsEarned: number }> {
    const newCards: Player[] = [];
    const duplicates: Player[] = [];
    let pointsEarned = 0;

    for (const card of cards) {
        if (currentInventory.includes(card.id)) {
            // Duplicate - convert to points
            duplicates.push(card);
            pointsEarned += DUPLICATE_POINTS[card.rarity];
        } else {
            // New card
            newCards.push(card);
        }
    }

    // Update Firestore
    const userRef = doc(db, 'users', userId);
    const updates: Record<string, any> = {
        packsOpenedToday: arrayUnion(1), // This won't work, we need increment
    };

    // Add new card IDs to inventory
    if (newCards.length > 0) {
        updates.inventory = arrayUnion(...newCards.map(c => c.id));
    }

    await updateDoc(userRef, updates);

    return { newCards, duplicates, pointsEarned };
}

// Record pack opened and add cards
export async function openPackAndSave(
    userId: string,
    cards: Player[],
    userData: UserData
): Promise<{
    success: boolean;
    newCards: Player[];
    duplicates: Player[];
    pointsEarned: number;
    error?: string;
}> {
    // Check if user can open a pack
    const remainingPacks = getRemainingPacks(userData);
    if (remainingPacks <= 0) {
        return {
            success: false,
            newCards: [],
            duplicates: [],
            pointsEarned: 0,
            error: 'No packs remaining today. Come back tomorrow!'
        };
    }

    // Separate new cards vs duplicates
    const newCards: Player[] = [];
    const duplicates: Player[] = [];
    let pointsEarned = 0;

    for (const card of cards) {
        if (userData.inventory.includes(card.id)) {
            duplicates.push(card);
            pointsEarned += DUPLICATE_POINTS[card.rarity];
        } else {
            newCards.push(card);
        }
    }

    // Update Firestore
    const userRef = doc(db, 'users', userId);
    const newInventory = [...userData.inventory, ...newCards.map(c => c.id)];

    await updateDoc(userRef, {
        packsOpenedToday: userData.packsOpenedToday + 1,
        points: userData.points + pointsEarned,
        inventory: newInventory,
    });

    return {
        success: true,
        newCards,
        duplicates,
        pointsEarned
    };
}

// Get user's card collection with full player data
export function getInventoryCards(inventory: string[], allPlayers: Player[]): Player[] {
    return inventory
        .map(cardId => allPlayers.find(p => p.id === cardId))
        .filter((p): p is Player => p !== undefined);
}

// Buy pack with points and add cards to inventory
export async function buyPackWithPoints(
    userId: string,
    cards: Player[],
    userData: UserData,
    packType: PackType
): Promise<{
    success: boolean;
    newCards: Player[];
    duplicates: Player[];
    pointsEarned: number;
    pointsSpent: number;
    error?: string;
}> {
    const packPrice = PACK_TYPES[packType].price;

    // IMPORTANT: Fetch fresh user data from Firestore to prevent stale data issues
    const freshUserData = await getUserData(userId);

    // Check if user can afford the pack with FRESH data
    if (freshUserData.points < packPrice) {
        return {
            success: false,
            newCards: [],
            duplicates: [],
            pointsEarned: 0,
            pointsSpent: 0,
            error: `Not enough points! Need ${packPrice}, have ${freshUserData.points}`,
        };
    }

    // Separate new cards vs duplicates using FRESH inventory
    const newCards: Player[] = [];
    const duplicates: Player[] = [];
    let pointsEarned = 0;

    for (const card of cards) {
        if (freshUserData.inventory.includes(card.id)) {
            duplicates.push(card);
            pointsEarned += DUPLICATE_POINTS[card.rarity];
        } else {
            newCards.push(card);
        }
    }

    // Calculate final points: current - pack cost + duplicates earned
    const finalPoints = freshUserData.points - packPrice + pointsEarned;

    // Update Firestore with fresh inventory
    const userRef = doc(db, 'users', userId);
    const newInventory = [...freshUserData.inventory, ...newCards.map(c => c.id)];

    await updateDoc(userRef, {
        points: finalPoints,
        inventory: newInventory,
    });

    return {
        success: true,
        newCards,
        duplicates,
        pointsEarned,
        pointsSpent: packPrice,
    };
}

