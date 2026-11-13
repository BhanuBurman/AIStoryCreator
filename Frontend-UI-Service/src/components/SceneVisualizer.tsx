import React, { useState } from 'react';
import { Camera, Eye, Download, Sparkles, Film, Copy, Check } from 'lucide-react';
import { CompletedBeat } from '../types/story';

interface Props {
  beat: CompletedBeat;
}

export const SceneVisualizer: React.FC<Props> = ({ beat }) => {
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const imageUrl = beat.image_url || (beat.image_local_path ? `/generated_images/${beat.image_local_path.split('\\').pop()?.split('/').pop()}` : null);

  const copyPrompt = () => {
    if (beat.image_prompt) {
      navigator.clipboard.writeText(beat.image_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-noir-800/80 border border-slate-800 rounded-xl overflow-hidden group">
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-noir-900/60 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Cinematography & Visual Still • Act {beat.act}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          <Film className="w-3 h-3" />
          <span>35mm • Portra 400</span>
        </div>
      </div>

      {/* Image Display */}
      <div className="relative aspect-[16/10] bg-noir-950 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={`Act ${beat.act}: ${beat.beat_title}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
              onClick={() => setLightboxOpen(true)}
              loading="lazy"
            />
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-noir-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
              <span className="text-xs text-slate-200 font-medium truncate max-w-[70%]">
                {beat.beat_title}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="p-1.5 rounded-lg bg-noir-900/80 hover:bg-noir-800 text-slate-200 transition-colors"
                  title="Expand Visual"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <a
                  href={imageUrl}
                  download={`act_${beat.act}_visual.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-noir-900/80 hover:bg-noir-800 text-slate-200 transition-colors"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-6 text-slate-500 space-y-2">
            <Camera className="w-8 h-8 mx-auto opacity-40 animate-pulse" />
            <p className="text-xs">Visual generation pending or synthesized.</p>
          </div>
        )}
      </div>

      {/* Synthesized Prompt Collapsible */}
      {beat.image_prompt && (
        <div className="p-3 border-t border-slate-800/80 bg-noir-900/40">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowPromptDetails(!showPromptDetails)}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showPromptDetails ? 'Hide Photorealistic Prompt' : 'View Photorealistic Prompt'}</span>
            </button>
            <button
              onClick={copyPrompt}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              title="Copy Diffusion Prompt"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {showPromptDetails && (
            <div className="mt-2.5 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-mono text-[10px] uppercase block mb-0.5">Synthesized 35mm Prompt:</span>
                <p className="text-slate-300 font-mono bg-noir-950/70 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed text-[11px]">
                  {beat.image_prompt}
                </p>
              </div>
              {beat.negative_prompt && (
                <div>
                  <span className="text-rose-400 font-mono text-[10px] uppercase block mb-0.5">Negative Prompt:</span>
                  <p className="text-slate-400 font-mono bg-noir-950/70 p-2 rounded-lg border border-slate-800/60 text-[10px]">
                    {beat.negative_prompt}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="max-w-5xl max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
            <img
              src={imageUrl}
              alt={beat.beat_title}
              className="rounded-xl object-contain max-h-[85vh] shadow-2xl border border-slate-700"
            />
            <div className="mt-2 text-center text-xs text-slate-400 font-mono">
              Act {beat.act}: {beat.beat_title} • Photorealistic 35mm Still
            </div>
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-3 right-3 bg-noir-900/80 hover:bg-noir-800 text-white p-2 rounded-full border border-slate-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
