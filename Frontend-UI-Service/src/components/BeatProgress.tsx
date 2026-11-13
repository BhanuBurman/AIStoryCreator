import React from 'react';
import { CheckCircle2, Circle, Clock, Sparkles } from 'lucide-react';
import { BeatPlan, CompletedBeat } from '../types/story';

interface Props {
  planBeats: BeatPlan[];
  completedBeats: CompletedBeat[];
  currentBeatIndex: number;
  onSelectBeat: (actIndex: number) => void;
  selectedBeatIndex: number;
}

export const BeatProgress: React.FC<Props> = ({
  planBeats,
  completedBeats,
  currentBeatIndex,
  onSelectBeat,
  selectedBeatIndex,
}) => {
  return (
    <div className="bg-noir-800/90 border border-slate-800/80 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400/90 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          5-Beat Narrative Arc
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          {completedBeats.length} / 5 Acts Written
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((actNum, idx) => {
          const isDone = completedBeats.some(b => b.act === actNum);
          const isCurrent = idx === currentBeatIndex && !isDone;
          const isSelected = selectedBeatIndex === idx;
          const beatTitle = planBeats[idx]?.beat_title || `Act ${actNum}`;

          return (
            <button
              key={actNum}
              onClick={() => onSelectBeat(idx)}
              className={`group text-left p-2.5 rounded-lg border transition-all duration-200 relative overflow-hidden ${
                isSelected
                  ? 'border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/50'
                  : isDone
                  ? 'border-emerald-800/50 bg-emerald-950/20 hover:border-emerald-700/60'
                  : isCurrent
                  ? 'border-amber-700/50 bg-amber-950/20 animate-pulse'
                  : 'border-slate-800/60 bg-noir-900/50 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Act {actNum}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-600" />
                )}
              </div>
              <p className="text-xs font-medium text-slate-200 truncate group-hover:text-amber-200">
                {beatTitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
