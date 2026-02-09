// Quiz Types and Constants

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    category: string;
}

export interface UserQuizData {
    questionsAnsweredToday: string[]; // IDs of questions answered correctly today
    lastQuizReset: number; // Timestamp of last reset
    totalCorrect: number; // All-time correct answers
}

// Quiz Constants
export const QUIZ_CONSTANTS = {
    QUESTIONS_PER_DAY: 10,
    POINTS_PER_CORRECT: 50,
} as const;

// Get today's date string (UTC) for consistent daily rotation
export function getTodayDateString(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

// Seeded random number generator for consistent daily questions
export function seededRandom(seed: number): () => number {
    return function () {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
}

// Hash a string to a number for seeding
export function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
