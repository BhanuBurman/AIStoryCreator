import React, { useState, useEffect } from 'react';
import {
  Feather,
  Settings as SettingsIcon,
  Plus,
  BookOpen,
  Sparkles,
  Server,
  Layers,
  ChevronRight,
  Compass,
  History,
  AlertCircle
} from 'lucide-react';
import { StoryState, StoryListItem, ServiceConfig } from './types/story';
import { api } from './services/api';
import { BeatProgress } from './components/BeatProgress';
import { CharacterCards } from './components/CharacterCards';
import { StoryReader } from './components/StoryReader';
import { ChatInterface } from './components/ChatInterface';
import { ModelSettingsModal } from './components/ModelSettingsModal';

export const App: React.FC = () => {
  const [activeStory, setActiveStory] = useState<StoryState | null>(null);
  const [storiesList, setStoriesList] = useState<StoryListItem[]>([]);
  const [selectedActIndex, setSelectedActIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [activeConfig, setActiveConfig] = useState<ServiceConfig | null>(null);
  const [serviceHealth, setServiceHealth] = useState<{ llm: boolean; workflow: boolean }>({ llm: false, workflow: false });
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const refreshAll = async () => {
    await checkStatus();
    await loadStories();
    await loadConfig();
  };

  const checkStatus = async () => {
    const health = await api.checkHealth();
    setServiceHealth(health);
  };

  const loadConfig = async () => {
    try {
      const cfg = await api.getConfig();
      setActiveConfig(cfg);
    } catch {}
  };

  const loadStories = async () => {
    try {
      const list = await api.listStories();
      setStoriesList(list);
      if (list.length > 0 && !activeStory) {
        // Load the latest story by default
        loadStory(list[0].session_id);
      }
    } catch {}
  };

  const loadStory = async (sessionId: string) => {
    try {
      setIsProcessing(true);
      const story = await api.getStory(sessionId);
      setActiveStory(story);
      setSelectedActIndex(Math.min(story.completed_beats.length, 4));
    } catch (err: any) {
      setErrorNotification(err.message || 'Failed to load story');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNewConcept = async (concept: string, tone?: string) => {
    try {
      setIsProcessing(true);
      setErrorNotification(null);
      const newStory = await api.startStory(concept, tone, false);
      setActiveStory(newStory);
      setSelectedActIndex(0);
      await loadStories();
    } catch (err: any) {
      setErrorNotification(err.message || 'Failed to initialize story');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (msg: string) => {
    if (!activeStory) {
      // If no active story, interpret message as starting a new story concept
      await handleStartNewConcept(msg);
      return;
    }
    try {
      setIsProcessing(true);
      setErrorNotification(null);
      const res = await api.sendChatMessage(activeStory.session_id, msg);
      setActiveStory({
        ...activeStory,
        chat_history: res.chat_history
      });
    } catch (err: any) {
      setErrorNotification(err.message || 'Chat co-author communication failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateNextBeat = async (guidance?: string) => {
    if (!activeStory) return;
    try {
      setIsProcessing(true);
      setErrorNotification(null);
      const updated = await api.nextBeat(activeStory.session_id, guidance);
      setActiveStory(updated);
      setSelectedActIndex(updated.current_beat_index - 1 >= 0 ? updated.current_beat_index - 1 : 0);
      await loadStories();
    } catch (err: any) {
      setErrorNotification(err.message || 'Beat generation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateBeat = async (actNumber: number, guidance?: string) => {
    if (!activeStory) return;
    try {
      setIsProcessing(true);
      setErrorNotification(null);
      const updated = await api.regenerateBeat(activeStory.session_id, actNumber, guidance);
      setActiveStory(updated);
      await loadStories();
    } catch (err: any) {
      setErrorNotification(err.message || 'Rewrite failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunAutopilot = async () => {
    if (!activeStory) return;
    try {
      setIsProcessing(true);
      setErrorNotification(null);
      const updated = await api.runAutopilot(activeStory.session_id);
      setActiveStory(updated);
      setSelectedActIndex(4);
      await loadStories();
    } catch (err: any) {
      setErrorNotification(err.message || 'Autopilot generation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const createBlankStory = () => {
    setActiveStory(null);
    setSelectedActIndex(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-noir-900 text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-noir-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-noir-950 font-bold shadow-lg shadow-amber-500/20">
              <Feather className="w-5 h-5 text-noir-950" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wider text-slate-100 cinzel flex items-center gap-2">
                AI Story Creator
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                  Microservices v1.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Switchable LLM Prose & Photorealistic Cinematography Studio
              </p>
            </div>
          </div>

          {/* Microservices Health & Model Details */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-noir-800/80 border border-slate-800 text-xs">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-mono">LLM:</span>
              <span className={`w-2 h-2 rounded-full ${serviceHealth.llm ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'}`} />
              <span className="text-slate-400 font-mono ml-2">Workflow:</span>
              <span className={`w-2 h-2 rounded-full ${serviceHealth.workflow ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'}`} />
            </div>

            {activeConfig && (
              <div className="px-3 py-1.5 rounded-lg bg-noir-800/80 border border-slate-800 text-[11px] font-mono text-amber-300/90 flex items-center gap-2">
                <span>{activeConfig.text_model.provider}:{activeConfig.text_model.model_name}</span>
                <span className="text-slate-600">|</span>
                <span>{activeConfig.image_model.provider}:{activeConfig.image_model.model_name}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-noir-800 hover:bg-noir-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Stories Archive"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Stories ({storiesList.length})</span>
            </button>

            <button
              onClick={createBlankStory}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-noir-900 flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Story</span>
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl bg-noir-800 hover:bg-noir-700 text-slate-300 border border-slate-700 transition-colors"
              title="Model Factory Settings"
            >
              <SettingsIcon className="w-4 h-4 text-slate-300 hover:text-amber-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Error alert toast */}
      {errorNotification && (
        <div className="bg-rose-950/80 border-b border-rose-800/80 px-4 py-2 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{errorNotification}</span>
          </div>
          <button onClick={() => setErrorNotification(null)} className="text-rose-400 hover:text-white px-2">
            ✕
          </button>
        </div>
      )}

      {/* History Slide-down Drawer */}
      {historyOpen && (
        <div className="bg-noir-950/95 border-b border-slate-800 px-4 py-4 backdrop-blur-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4" />
                Narrative Library ({storiesList.length})
              </h3>
              <button onClick={() => setHistoryOpen(false)} className="text-xs text-slate-400 hover:text-white">
                Close
              </button>
            </div>
            {storiesList.length === 0 ? (
              <p className="text-xs text-slate-500">No stories saved yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {storiesList.map(item => (
                  <button
                    key={item.session_id}
                    onClick={() => {
                      loadStory(item.session_id);
                      setHistoryOpen(false);
                    }}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      activeStory?.session_id === item.session_id
                        ? 'border-amber-500/80 bg-amber-500/10'
                        : 'border-slate-800 bg-noir-800/60 hover:border-slate-700'
                    }`}
                  >
                    <h4 className="text-xs font-bold text-slate-100 truncate mb-1">
                      {item.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{item.genre}</span>
                      <span>{item.completed_beats_count} / {item.total_beats} Acts</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chat Director & Dramatis Personae (5 cols) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Chat Director Assistant */}
          <div className="flex-1 min-h-[480px]">
            <ChatInterface
              story={activeStory}
              onSendMessage={handleSendMessage}
              onGenerateNextBeat={handleGenerateNextBeat}
              onRunAutopilot={handleRunAutopilot}
              onStartNewConcept={handleStartNewConcept}
              isProcessing={isProcessing}
            />
          </div>

          {/* Dramatis Personae & World backdrop */}
          {activeStory?.outline && (
            <CharacterCards
              characters={activeStory.outline.characters}
              setting={activeStory.outline.setting}
            />
          )}
        </div>

        {/* Right Column: Narrative Studio & Literary Reader (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeStory?.outline ? (
            <div className="space-y-6">
              {/* Story Header Banner */}
              <div className="bg-noir-800/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-mono uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                      {activeStory.outline.genre}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {activeStory.outline.tone}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 cinzel mb-2">
                    {activeStory.outline.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                    "{activeStory.outline.logline}"
                  </p>
                </div>
              </div>

              {/* 5-Beat Interactive Stepper */}
              <BeatProgress
                planBeats={activeStory.outline.plot_beats}
                completedBeats={activeStory.completed_beats}
                currentBeatIndex={activeStory.current_beat_index}
                onSelectBeat={idx => setSelectedActIndex(idx)}
                selectedBeatIndex={selectedActIndex}
              />

              {/* Literary Story Prose & Photorealistic Cinematography */}
              <StoryReader
                story={activeStory}
                selectedActIndex={selectedActIndex}
                onRegenerateBeat={handleRegenerateBeat}
                isGenerating={isProcessing}
              />
            </div>
          ) : (
            /* Empty State: Ready to create */
            <div className="h-full min-h-[550px] bg-noir-800/40 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-200 cinzel">
                Your Narrative Awaits
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                The Story Architect stands ready. Use the Story Director chat on the left to brainstorm, select one of the inspirational seeds, or describe any character, conflict, or setting.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-mono text-slate-500">
                <span>5-Beat Outliner</span>
                <span>•</span>
                <span>Literary Prose Writer</span>
                <span>•</span>
                <span>Photorealistic Visuals</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-4 py-3 bg-noir-950 text-slate-500 text-[11px] text-center font-mono">
        AIStoryCreator Monorepo • LLM-Service (8001) | Workflow-Engine-Service (8002) | Frontend-UI-Service (3000)
      </footer>

      {/* Model Settings Drawer Modal */}
      <ModelSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConfigSaved={() => {
          loadConfig();
          checkStatus();
        }}
      />
    </div>
  );
};

export default App;
