import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Wand2, PlayCircle, Loader2 } from 'lucide-react';
import { StoryState } from '../types/story';

interface Props {
  story: StoryState | null;
  onSendMessage: (msg: string) => Promise<void>;
  onGenerateNextBeat: (guidance?: string) => Promise<void>;
  onRunAutopilot: () => Promise<void>;
  onStartNewConcept: (concept: string, tone?: string) => Promise<void>;
  isProcessing: boolean;
}

const INSPIRATION_PROMPTS = [
  { title: "Gothic Steampunk Clockmaker", genre: "Steampunk Noir", desc: "An exiled horologist uncovers a waterlogged pocket watch counting down to the day the sea reverses." },
  { title: "The Last Cybernetic Oracle", genre: "Cyberpunk", desc: "In rain-drenched Neo-Kyoto, a synth-priestess loses her signal to the planetary mainframe." },
  { title: "Whispers in the Black Pines", genre: "Folk Horror", desc: "A cartographer sent to survey a forgotten valley discovers that the borders shift whenever someone sleeps." }
];

export const ChatInterface: React.FC<Props> = ({
  story,
  onSendMessage,
  onGenerateNextBeat,
  onRunAutopilot,
  onStartNewConcept,
  isProcessing,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [story?.chat_history, isProcessing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    const msg = input.trim();
    setInput('');
    await onSendMessage(msg);
  };

  return (
    <div className="flex flex-col h-full bg-noir-800/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-3.5 bg-noir-900/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              Story Director Co-Author
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {story ? `Directing: "${story.outline?.title || 'Story'}"` : 'Awaiting narrative spark'}
            </p>
          </div>
        </div>

        {/* Quick Workflow Action Buttons */}
        {story?.outline && (
          <div className="flex items-center gap-1.5">
            {story.current_beat_index < 5 && (
              <button
                onClick={() => onGenerateNextBeat()}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500 hover:bg-amber-400 text-noir-900 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                title="Generate next beat with visual"
              >
                <Wand2 className="w-3 h-3" />
                <span>Next Scene</span>
              </button>
            )}
            {story.current_beat_index < 5 && (
              <button
                onClick={() => onRunAutopilot()}
                disabled={isProcessing}
                className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Autopilot 5 Acts"
              >
                <PlayCircle className="w-3 h-3 text-amber-400" />
                <span>Autopilot</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[300px] max-h-[500px]">
        {!story && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-1.5">
              <Sparkles className="w-8 h-8 mx-auto text-amber-400/80" />
              <h4 className="text-sm font-semibold text-slate-100 cinzel">
                Begin a New Cinematic Story
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Pitch an idea, or pick an inspiring story premise below to generate a 5-beat blueprint and photorealistic scenes.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {INSPIRATION_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onStartNewConcept(item.desc, item.genre)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-800/80 bg-noir-900/60 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-200">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
                      {item.genre}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {story?.chat_history.map((msg, index) => {
          const isBot = msg.role === 'assistant';
          return (
            <div
              key={index}
              className={`flex gap-2.5 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  isBot
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>
              <div
                className={`rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[85%] ${
                  isBot
                    ? 'bg-noir-900/80 border border-slate-800 text-slate-200'
                    : 'bg-amber-500 text-noir-900 font-medium'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-amber-400/90 font-mono py-2 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Story Director & Visual Synthesizer crafting...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 bg-noir-900/90 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isProcessing}
            placeholder={
              story
                ? "Direct the scene, ask for advice, or type story ideas..."
                : "Enter a story concept or title to begin..."
            }
            className="flex-1 bg-noir-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-noir-900 font-semibold disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
