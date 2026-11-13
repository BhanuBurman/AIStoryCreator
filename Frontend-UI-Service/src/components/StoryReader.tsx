import React, { useState } from 'react';
import { BookOpen, RefreshCw, Feather, Copy, Check, FileDown, Layers } from 'lucide-react';
import { StoryState, CompletedBeat } from '../types/story';
import { SceneVisualizer } from './SceneVisualizer';

interface Props {
  story: StoryState;
  selectedActIndex: number;
  onRegenerateBeat: (actNumber: number, guidance?: string) => Promise<void>;
  isGenerating: boolean;
}

export const StoryReader: React.FC<Props> = ({
  story,
  selectedActIndex,
  onRegenerateBeat,
  isGenerating,
}) => {
  const [viewMode, setViewMode] = useState<'single' | 'full'>('single');
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenGuidance, setRegenGuidance] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedBeat = story.completed_beats.find(b => b.act === selectedActIndex + 1);
  const planBeat = story.outline?.plot_beats[selectedActIndex];

  const handleRegenerate = async () => {
    if (!planBeat) return;
    await onRegenerateBeat(planBeat.act, regenGuidance);
    setShowRegenModal(false);
    setRegenGuidance('');
  };

  const copyFullStory = () => {
    if (!story.outline) return;
    let md = `# ${story.outline.title}\n\n*${story.outline.logline}*\n\n**Genre:** ${story.outline.genre} | **Tone:** ${story.outline.tone}\n\n---\n\n`;
    story.completed_beats.forEach(b => {
      md += `## Act ${b.act}: ${b.beat_title}\n\n${b.prose}\n\n`;
      if (b.image_prompt) {
        md += `> **Visual Prompt:** ${b.image_prompt}\n\n`;
      }
    });
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const calculateWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Reader Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-noir-800/80 border border-slate-800/80 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              viewMode === 'single'
                ? 'bg-amber-500 text-noir-900 font-semibold'
                : 'bg-noir-900 text-slate-300 hover:bg-noir-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Act Focus
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              viewMode === 'full'
                ? 'bg-amber-500 text-noir-900 font-semibold'
                : 'bg-noir-900 text-slate-300 hover:bg-noir-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Full Manuscript ({story.completed_beats.length} Acts)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedBeat && viewMode === 'single' && (
            <button
              onClick={() => setShowRegenModal(true)}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-noir-900 text-amber-300 border border-amber-500/30 hover:border-amber-500/60 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              Rewrite Act {selectedBeat.act}
            </button>
          )}

          <button
            onClick={copyFullStory}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-noir-900 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-1.5"
            title="Copy as Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Export Markdown'}</span>
          </button>
        </div>
      </div>

      {/* Main Reading Area */}
      {viewMode === 'single' ? (
        <div className="space-y-6">
          {selectedBeat ? (
            <div className="space-y-6">
              {/* Scene Visualizer */}
              <SceneVisualizer beat={selectedBeat} />

              {/* Prose Card */}
              <div className="bg-noir-800/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
                <div className="border-b border-slate-800/80 pb-4 mb-6">
                  <div className="flex items-center justify-between text-xs font-mono text-amber-400/90 uppercase tracking-widest mb-1">
                    <span>Act {selectedBeat.act}</span>
                    <span>{calculateWords(selectedBeat.prose)} Words • ~{Math.ceil(calculateWords(selectedBeat.prose) / 200)} min read</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 cinzel">
                    {selectedBeat.beat_title}
                  </h2>
                  <p className="text-xs text-slate-400 italic mt-1.5">
                    {selectedBeat.description}
                  </p>
                </div>

                <div className="prose-literary text-slate-200 space-y-4 whitespace-pre-line">
                  {selectedBeat.prose}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-noir-800/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Feather className="w-10 h-10 mx-auto text-amber-500/40" />
              <h3 className="text-lg font-medium text-slate-300 cinzel">
                Act {selectedActIndex + 1}: {planBeat?.beat_title || 'Unwritten Chapter'}
              </h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                {planBeat?.description || 'This beat has not been penned yet. Use the Chat Assistant or click "Generate Next Scene" below.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Full Manuscript View */
        <div className="space-y-12">
          {story.completed_beats.length > 0 ? (
            story.completed_beats.map(beat => (
              <div key={beat.act} className="space-y-6 border-b border-slate-800/80 pb-12 last:border-b-0">
                <SceneVisualizer beat={beat} />
                <div className="bg-noir-800/50 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
                  <div className="flex items-center justify-between text-xs font-mono text-amber-400/90 uppercase tracking-widest mb-1">
                    <span>Act {beat.act} of 5</span>
                    <span>{calculateWords(beat.prose)} Words</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 cinzel mb-1">
                    {beat.beat_title}
                  </h2>
                  <p className="text-xs text-slate-400 italic mb-6">
                    {beat.description}
                  </p>
                  <div className="prose-literary text-slate-200 space-y-4 whitespace-pre-line">
                    {beat.prose}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              No acts have been generated yet.
            </div>
          )}
        </div>
      )}

      {/* Rewrite Guidance Modal */}
      {showRegenModal && selectedBeat && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-noir-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 cinzel">
              Rewrite Act {selectedBeat.act}: {selectedBeat.beat_title}
            </h3>
            <p className="text-xs text-slate-400">
              Provide author notes, tone adjustments, or specific dialogues/twists you want included in this revision.
            </p>
            <textarea
              value={regenGuidance}
              onChange={e => setRegenGuidance(e.target.value)}
              placeholder="e.g., Increase the tension between Corvin and Lady Vane; describe the cold brass gearwork ticking with urgent fury..."
              rows={4}
              className="w-full bg-noir-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/80"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRegenModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-noir-900 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                Confirm Rewrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
