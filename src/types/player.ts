// Player card types for Football Attax

export interface PlayerStats {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
}

export interface Player {
    id: string;
    fifaId?: string;
    name: string;
    fullName: string;
    club: string;
    nationality: string;
    position: string;
    photoUrl?: string;
    isLegend?: boolean;
    stats: PlayerStats;
    overall: number;
    rarity: 'icon' | 'legendary' | 'epic' | 'rare' | 'common';
}

// Rarity colors and styles
export const RARITY_CONFIG = {
    icon: {
        gradient: 'from-amber-300 via-yellow-200 to-amber-400',
        border: 'border-amber-300',
        glow: 'shadow-amber-400/70',
        label: '👑 ICON',
        bgPattern: 'bg-gradient-to-br from-amber-900/30 via-yellow-800/40 to-amber-900/30',
    },
    legendary: {
        gradient: 'from-yellow-400 via-amber-500 to-orange-600',
        border: 'border-yellow-400',
        glow: 'shadow-yellow-500/50',
        label: '⭐ LEGENDARY',
        bgPattern: 'bg-gradient-to-br from-yellow-900/20 via-amber-800/30 to-orange-900/20',
    },
    epic: {
        gradient: 'from-purple-400 via-violet-500 to-purple-600',
        border: 'border-purple-400',
        glow: 'shadow-purple-500/50',
        label: '💜 EPIC',
        bgPattern: 'bg-gradient-to-br from-purple-900/20 via-violet-800/30 to-purple-900/20',
    },
    rare: {
        gradient: 'from-blue-400 via-cyan-500 to-blue-600',
        border: 'border-blue-400',
        glow: 'shadow-blue-500/50',
        label: '💙 RARE',
        bgPattern: 'bg-gradient-to-br from-blue-900/20 via-cyan-800/30 to-blue-900/20',
    },
    common: {
        gradient: 'from-gray-300 via-slate-400 to-gray-500',
        border: 'border-gray-400',
        glow: 'shadow-gray-500/50',
        label: '🤍 COMMON',
        bgPattern: 'bg-gradient-to-br from-gray-900/20 via-slate-800/30 to-gray-900/20',
    },
} as const;
