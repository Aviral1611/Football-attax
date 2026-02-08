'use client';

import { Player, RARITY_CONFIG } from '@/types/player';

interface PlayerCardProps {
    player: Player;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
    isFlipped?: boolean;
}

export default function PlayerCard({
    player,
    size = 'md',
    onClick,
    isFlipped = false
}: PlayerCardProps) {
    const rarity = RARITY_CONFIG[player.rarity];
    const isIcon = player.rarity === 'icon' || player.isLegend;

    // Size configurations
    const sizeConfig = {
        sm: { card: 'w-40 h-56', text: 'text-xs', overall: 'text-2xl', stats: 'text-[10px]' },
        md: { card: 'w-52 h-72', text: 'text-sm', overall: 'text-3xl', stats: 'text-xs' },
        lg: { card: 'w-64 h-88', text: 'text-base', overall: 'text-4xl', stats: 'text-sm' },
    };

    const s = sizeConfig[size];

    return (
        <div
            className={`${s.card} perspective-1000 cursor-pointer group`}
            onClick={onClick}
        >
            <div className={`
        relative w-full h-full transition-transform duration-700 transform-style-3d
        ${isFlipped ? 'rotate-y-180' : ''}
      `}>
                {/* Front of card */}
                <div className={`
          absolute inset-0 backface-hidden
          ${isIcon
                        ? 'bg-gradient-to-br from-amber-900 via-yellow-900/80 to-amber-950'
                        : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'}
          rounded-xl overflow-hidden
          border-2 ${isIcon ? 'border-amber-400' : rarity.border}
          shadow-lg ${isIcon ? 'shadow-amber-500/60' : rarity.glow} shadow-xl
          group-hover:shadow-2xl group-hover:scale-105
          transition-all duration-300
        `}>
                    {/* Icon special animated border glow */}
                    {isIcon && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-20 animate-pulse" />
                    )}

                    {/* Rarity gradient top bar */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${rarity.gradient} ${isIcon ? 'h-2' : ''}`} />

                    {/* Card content */}
                    <div className="relative p-3 h-full flex flex-col">
                        {/* Icon badge */}
                        {isIcon && (
                            <div className="absolute -top-1 -right-1 z-10">
                                <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[8px] font-black px-2 py-0.5 rounded-bl-lg rounded-tr-lg shadow-lg">
                                    LEGEND
                                </div>
                            </div>
                        )}

                        {/* Top section - Overall & Position */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col items-center">
                                <span className={`${s.overall} font-black ${isIcon ? 'text-amber-300' : 'text-white'} drop-shadow-lg`}>
                                    {player.overall}
                                </span>
                                <span className={`${s.stats} font-bold ${isIcon ? 'text-amber-200' : 'text-gray-300'} uppercase tracking-wider`}>
                                    {player.position}
                                </span>
                            </div>

                            {/* Nation & Club badges area */}
                            <div className="flex flex-col gap-1 items-center">
                                <div className={`w-6 h-4 ${isIcon ? 'bg-amber-900/60' : 'bg-gray-700'} rounded flex items-center justify-center`}>
                                    <span className="text-[8px]">🏳️</span>
                                </div>
                                <div className={`w-6 h-6 ${isIcon ? 'bg-amber-900/60' : 'bg-gray-700'} rounded-full flex items-center justify-center`}>
                                    <span className="text-[10px]">{isIcon ? '👑' : '⚽'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Player image */}
                        <div className={`
              flex-1 flex items-center justify-center
              ${isIcon
                                ? 'bg-gradient-to-br from-amber-800/40 via-yellow-700/50 to-amber-900/40 ring-1 ring-amber-500/30'
                                : rarity.bgPattern} 
              rounded-lg mb-2
              border ${isIcon ? 'border-amber-500/30' : 'border-white/10'} overflow-hidden
            `}>
                            {player.photoUrl ? (
                                <img
                                    src={player.photoUrl}
                                    alt={player.name}
                                    className="h-full w-auto object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <div className={`text-6xl opacity-50 ${player.photoUrl ? 'hidden' : ''}`}>
                                {isIcon ? '👑' : '👤'}
                            </div>
                        </div>

                        {/* Player name */}
                        <div className={`
              text-center py-1.5 px-2 rounded-md mb-2
              bg-gradient-to-r ${rarity.gradient}
              ${isIcon ? 'ring-1 ring-amber-300/50' : ''}
            `}>
                            <h3 className={`${s.text} font-bold text-white truncate drop-shadow-md`}>
                                {player.name}
                            </h3>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-1">
                            <StatBox label="PAC" value={player.stats.pace} size={s.stats} isIcon={isIcon} />
                            <StatBox label="SHO" value={player.stats.shooting} size={s.stats} isIcon={isIcon} />
                            <StatBox label="PAS" value={player.stats.passing} size={s.stats} isIcon={isIcon} />
                            <StatBox label="DRI" value={player.stats.dribbling} size={s.stats} isIcon={isIcon} />
                            <StatBox label="DEF" value={player.stats.defending} size={s.stats} isIcon={isIcon} />
                            <StatBox label="PHY" value={player.stats.physical} size={s.stats} isIcon={isIcon} />
                        </div>

                        {/* Club name */}
                        <div className="mt-2 text-center">
                            <span className={`${s.stats} ${isIcon ? 'text-amber-300/70' : 'text-gray-400'} truncate block`}>
                                {player.club}
                            </span>
                        </div>
                    </div>

                    {/* Holographic overlay effect - enhanced for icons */}
                    <div className={`
            absolute inset-0 opacity-0 group-hover:opacity-30
            ${isIcon
                            ? 'bg-gradient-to-tr from-amber-400/20 via-yellow-200 to-amber-300/20'
                            : 'bg-gradient-to-tr from-transparent via-white to-transparent'}
            transition-opacity duration-300 pointer-events-none
            rounded-xl
          `} />
                </div>

                {/* Back of card */}
                <div className={`
          absolute inset-0 backface-hidden rotate-y-180
          ${isIcon
                        ? 'bg-gradient-to-br from-amber-900 via-yellow-900/80 to-amber-950'
                        : 'bg-gradient-to-br from-gray-800 via-gray-900 to-black'}
          rounded-xl overflow-hidden
          border-2 ${isIcon ? 'border-amber-400' : rarity.border}
          flex items-center justify-center
        `}>
                    <div className="text-center p-4">
                        <div className="text-6xl mb-4">{isIcon ? '👑' : '⚽'}</div>
                        <div className={`text-xl font-bold bg-gradient-to-r ${rarity.gradient} bg-clip-text text-transparent`}>
                            {isIcon ? 'LEGEND' : 'FOOTBALL ATTAX'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Stat box component
function StatBox({ label, value, size, isIcon }: { label: string; value: number; size: string; isIcon?: boolean }) {
    const getStatColor = (val: number) => {
        if (val >= 90) return isIcon ? 'text-amber-300' : 'text-green-400';
        if (val >= 80) return isIcon ? 'text-amber-400' : 'text-lime-400';
        if (val >= 70) return isIcon ? 'text-yellow-400' : 'text-yellow-400';
        if (val >= 60) return 'text-orange-400';
        return 'text-red-400';
    };

    return (
        <div className={`${isIcon ? 'bg-amber-950/60' : 'bg-black/40'} rounded px-1 py-0.5 flex justify-between items-center`}>
            <span className={`${size} ${isIcon ? 'text-amber-200/70' : 'text-gray-400'} font-medium`}>{label}</span>
            <span className={`${size} font-bold ${getStatColor(value)}`}>{value}</span>
        </div>
    );
}
