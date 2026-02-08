import PlayerCard from '@/components/PlayerCard';
import { Player } from '@/types/player';
import playersData from '@/data/players.json';

export default function Home() {
  // Get sample players from each rarity
  const players = playersData as Player[];

  const samplePlayers = {
    legendary: players.find(p => p.rarity === 'legendary'),
    epic: players.find(p => p.rarity === 'epic'),
    rare: players.find(p => p.rarity === 'rare'),
    common: players.find(p => p.rarity === 'common'),
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600 bg-clip-text text-transparent mb-4">
          ⚽ FOOTBALL ATTAX
        </h1>
        <p className="text-gray-400 text-lg">
          Collect legendary players • Open packs daily • Build your dream team
        </p>
      </div>

      {/* Card showcase */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Card Rarities
        </h2>

        <div className="flex flex-wrap justify-center gap-8">
          {samplePlayers.legendary && (
            <div className="flex flex-col items-center gap-2">
              <PlayerCard player={samplePlayers.legendary} size="md" />
              <span className="text-yellow-400 font-bold">LEGENDARY</span>
            </div>
          )}

          {samplePlayers.epic && (
            <div className="flex flex-col items-center gap-2">
              <PlayerCard player={samplePlayers.epic} size="md" />
              <span className="text-purple-400 font-bold">EPIC</span>
            </div>
          )}

          {samplePlayers.rare && (
            <div className="flex flex-col items-center gap-2">
              <PlayerCard player={samplePlayers.rare} size="md" />
              <span className="text-blue-400 font-bold">RARE</span>
            </div>
          )}

          {samplePlayers.common && (
            <div className="flex flex-col items-center gap-2">
              <PlayerCard player={samplePlayers.common} size="md" />
              <span className="text-gray-400 font-bold">COMMON</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats section */}
      <div className="max-w-4xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard number="400" label="Players" />
        <StatCard number="2" label="Packs/Day" />
        <StatCard number="5" label="Cards/Pack" />
        <StatCard number="4" label="Rarities" />
      </div>

      {/* Open Pack CTA */}
      <div className="text-center mt-16">
        <a href="/open-pack" className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white text-lg hover:scale-105 transition-transform shadow-lg shadow-orange-500/30">
          🎁 Open Pack
        </a>
      </div>
    </main>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700">
      <div className="text-3xl font-black text-white">{number}</div>
      <div className="text-gray-400 text-sm mt-1">{label}</div>
    </div>
  );
}
