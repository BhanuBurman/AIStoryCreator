import React from 'react';
import { User, ShieldAlert, HeartHandshake, Compass, Globe } from 'lucide-react';
import { Character, Setting } from '../types/story';

interface Props {
  characters: Character[];
  setting: Setting;
}

export const CharacterCards: React.FC<Props> = ({ characters, setting }) => {
  const getRoleIcon = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('antagonist') || r.includes('villain')) {
      return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    }
    if (r.includes('mentor') || r.includes('guide')) {
      return <HeartHandshake className="w-4 h-4 text-emerald-400" />;
    }
    return <User className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Setting Card */}
      <div className="bg-noir-800/80 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
          <Globe className="w-4 h-4" />
          World & Atmosphere
        </div>
        <h4 className="text-sm font-semibold text-slate-100 mb-1">
          {setting.world_name}
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          {setting.description}
        </p>
      </div>

      {/* Characters List */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider px-1">
          <Compass className="w-4 h-4 text-amber-400" />
          Dramatis Personae ({characters.length})
        </div>

        {characters.map((char, i) => (
          <div
            key={i}
            className="bg-noir-800/70 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700/80 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getRoleIcon(char.role)}
                <span className="text-sm font-semibold text-slate-100">{char.name}</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300/90 border border-slate-700">
                {char.role}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Appearance: </span>
                <span className="text-slate-300">{char.appearance}</span>
              </div>
              <div>
                <span className="text-rose-400/90 font-medium">Internal Conflict: </span>
                <span className="text-slate-300 italic">{char.internal_conflict}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
