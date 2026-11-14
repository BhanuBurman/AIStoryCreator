import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Image as ImageIcon,
  ChevronDown,
  Terminal,
  Code2,
  Flame,
  BookOpen,
  Download,
  AlertCircle,
  ExternalLink,
  X
} from 'lucide-react';
import { ChatMessage, ChatConversation } from '../types/story';
import { api } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';

interface GeneralChatInterfaceProps {
  onOpenSettings: () => void;
  onSwitchToStoryStudio: () => void;
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
  general: <Sparkles size={14} className="text-amber-400" />,
  uncensored: <Flame size={14} className="text-rose-400" />,
  code: <Code2 size={14} className="text-emerald-400" />,
  story: <BookOpen size={14} className="text-purple-400" />
};

export const GeneralChatInterface: React.FC<GeneralChatInterfaceProps> = ({
  onOpenSettings,
  onSwitchToStoryStudio
}) => {
  // Chat Conversations State (Persisted in localStorage)
  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    try {
      const saved = localStorage.getItem('antigravity_conversations');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'default-chat-1',
        title: 'New Chat',
        messages: [],
        presetId: 'general',
        modelName: 'dolphin-llama3:latest',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('antigravity_active_chat_id');
      if (saved) return saved;
    } catch {}
    return 'default-chat-1';
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('dolphin-llama3:latest');
  const [selectedPreset, setSelectedPreset] = useState('general');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [imageMode, setImageMode] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active Conversation
  const activeConversation =
    conversations.find((c) => c.id === activeChatId) || conversations[0];

  // Save conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('antigravity_conversations', JSON.stringify(conversations));
      localStorage.setItem('antigravity_active_chat_id', activeChatId);
    } catch {}
  }, [conversations, activeChatId]);

  // Load models and presets from backend
  useEffect(() => {
    api
      .getAvailableModels()
      .then((data) => {
        if (data.local_models && data.local_models.length > 0) {
          setAvailableModels(data.local_models);
          // If active chat has a model that's available, use it, else default to dolphin or first model
          const hasDolphin = data.local_models.some((m) => m.name.includes('dolphin'));
          if (hasDolphin && !activeConversation.modelName) {
            setSelectedModel('dolphin-llama3:latest');
          } else if (data.local_models[0]) {
            setSelectedModel(activeConversation.modelName || data.local_models[0].name);
          }
        }
        if (data.presets) {
          setPresets(data.presets);
        }
      })
      .catch(() => {
        // Fallback default list
        setAvailableModels([
          { name: 'dolphin-llama3:latest', parameter_size: '8B', provider: 'ollama' },
          { name: 'qwen2.5:3b', parameter_size: '3B', provider: 'ollama' }
        ]);
      });
  }, []);

  // Sync state when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      if (activeConversation.modelName) setSelectedModel(activeConversation.modelName);
      if (activeConversation.presetId) setSelectedPreset(activeConversation.presetId);
    }
  }, [activeChatId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isGenerating]);

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const createNewChat = () => {
    const newChat: ChatConversation = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      presetId: selectedPreset,
      modelName: selectedModel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setConversations((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setInputMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        return [
          {
            id: `chat-${Date.now()}`,
            title: 'New Chat',
            messages: [],
            presetId: 'general',
            modelName: selectedModel,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
      }
      return filtered;
    });
    if (activeChatId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining.length > 0) setActiveChatId(remaining[0].id);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputMessage).trim();
    if (!content || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update title of chat if first message
    const isFirstMessage = activeConversation.messages.length === 0;
    const newTitle = isFirstMessage ? content.slice(0, 32) + (content.length > 32 ? '...' : '') : activeConversation.title;

    const updatedMessages = [...activeConversation.messages, userMessage];

    // Optimistically update conversation
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              title: newTitle,
              messages: updatedMessages,
              updatedAt: new Date().toISOString()
            }
          : c
      )
    );

    setInputMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsGenerating(true);

    try {
      // Find system instruction from preset
      const currentPresetObj = presets.find((p) => p.id === selectedPreset);
      const systemInstruction = currentPresetObj ? currentPresetObj.prompt : undefined;

      // Format messages payload for LLM
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const response = await api.generalChat({
        messages: apiMessages,
        system_instruction: systemInstruction,
        model_name: selectedModel,
        provider: 'ollama',
        generate_image: imageMode
      });

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.message || 'No response generated.',
        model_name: response.model_name || selectedModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: response.image
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [...updatedMessages, assistantMessage],
                updatedAt: new Date().toISOString()
              }
            : c
        )
      );

      // Reset image mode after generating an image
      if (imageMode) setImageMode(false);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `**Error:** ${err.message || 'Failed to communicate with LLM Service. Please verify that Ollama is running.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [...updatedMessages, errorMessage],
                updatedAt: new Date().toISOString()
              }
            : c
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdown = () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const lines = [`# ${activeConversation.title}\n`];
    lines.push(`*Generated with ${selectedModel} on ${new Date().toLocaleDateString()}*\n\n---\n`);

    activeConversation.messages.forEach((msg) => {
      lines.push(`### ${msg.role === 'user' ? '👤 You' : `🤖 Assistant (${msg.model_name || selectedModel})`}\n`);
      lines.push(`${msg.content}\n\n`);
      if (msg.image?.url) {
        lines.push(`![Generated Visual](${msg.image.url})\n\n`);
      }
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0d14] text-zinc-100 font-sans overflow-hidden">
      {/* 1. Left Sidebar (ChatGPT / Claude style) */}
      <aside className="w-64 md:w-72 bg-[#0e121b] border-r border-zinc-800/80 flex flex-col justify-between flex-shrink-0 z-20">
        {/* Top: Header & New Chat */}
        <div className="p-3.5 border-b border-zinc-800/70 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-zinc-950 font-bold shadow-md shadow-amber-500/20">
                ⚡
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  Nexus AI <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">Chat</span>
                </h1>
                <p className="text-[11px] text-zinc-400">GTX 1650 • Ollama Local</p>
              </div>
            </div>
          </div>

          {/* New Chat Button */}
          <button
            onClick={createNewChat}
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-white font-medium text-xs md:text-sm border border-zinc-700/60 shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-amber-400 group-hover:rotate-90 transition-transform" />
              <span>New chat</span>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">Ctrl+K</span>
          </button>

          {/* Studio Switcher Banner */}
          <button
            onClick={onSwitchToStoryStudio}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium transition-all group text-left"
          >
            <BookOpen size={14} className="text-purple-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="truncate">
              <span className="font-semibold block text-purple-200">Open Story Studio</span>
              <span className="text-[10px] text-purple-400/80">5-Beat manuscript creator</span>
            </div>
          </button>
        </div>

        {/* Middle: Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="px-2 pb-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Recent Conversations
          </div>

          {conversations.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs md:text-sm cursor-pointer transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-white font-medium border border-zinc-700/80'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-zinc-500 text-xs">💬</span>
                  <span className="truncate">{chat.title || 'Untitled Chat'}</span>
                </div>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom: Model & Settings Bar */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/50 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] text-zinc-300 truncate">
                {selectedModel.split(':')[0]}
              </span>
            </div>
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Model Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Chat Area */}
      <main className="flex-1 flex flex-col h-full bg-[#0a0d14] relative">
        {/* Top Navigation Bar (Model Selector & Persona Pills) */}
        <header className="h-14 border-b border-zinc-800/80 bg-[#0e121b]/80 backdrop-blur px-4 md:px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Model Selector Dropdown */}
            <div className="relative group">
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === activeChatId ? { ...c, modelName: e.target.value } : c
                    )
                  );
                }}
                className="appearance-none bg-zinc-850 hover:bg-zinc-800 text-white text-xs md:text-sm font-semibold pl-3 pr-8 py-1.5 rounded-xl border border-zinc-700/80 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
              >
                {availableModels.map((m) => (
                  <option key={m.name} value={m.name} className="bg-zinc-900 text-white">
                    {m.name.includes('dolphin') ? '🐬 ' : '⚡ '} {m.name} ({m.parameter_size || 'Local'})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"
              />
            </div>

            {/* Persona Preset Pills (Claude / ChatGPT style roles) */}
            <div className="hidden lg:flex items-center gap-1.5 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
              {[
                { id: 'general', label: 'General Assistant', icon: PRESET_ICONS.general },
                { id: 'uncensored', label: '100% Uncensored', icon: PRESET_ICONS.uncensored },
                { id: 'code', label: 'Code Architect', icon: PRESET_ICONS.code },
                { id: 'story', label: 'Creative Writer', icon: PRESET_ICONS.story }
              ].map((p) => {
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPreset(p.id);
                      setConversations((prev) =>
                        prev.map((c) =>
                          c.id === activeChatId ? { ...c, presetId: p.id } : c
                        )
                      );
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                    }`}
                  >
                    {p.icon}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {activeConversation.messages.length > 0 && (
              <>
                <button
                  onClick={handleExportMarkdown}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-xs font-medium transition-colors"
                  title="Export Chat as Markdown"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => {
                    setConversations((prev) =>
                      prev.map((c) => (c.id === activeChatId ? { ...c, messages: [] } : c))
                    );
                  }}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                  title="Clear conversation messages"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Message Thread Container */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          {/* Empty State / Welcome Hero (Claude & ChatGPT Style) */}
          {activeConversation.messages.length === 0 ? (
            <div className="max-w-3xl mx-auto h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 shadow-2xl">
                <Sparkles size={28} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                How can I help you today?
              </h2>
              <p className="text-zinc-400 text-sm max-w-md mb-8">
                Powered by your local uncensored <span className="text-amber-400 font-mono font-medium">{selectedModel}</span> and GTX 1650. Chat freely with zero filters, write code, or generate 35mm photos.
              </p>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                {[
                  {
                    icon: <Code2 size={16} className="text-emerald-400" />,
                    title: 'Write a Python Script',
                    prompt: 'Write a clean Python script using asyncio to scrape and parse live market data with error handling.'
                  },
                  {
                    icon: <Flame size={16} className="text-rose-400" />,
                    title: '100% Uncensored Creative Writing',
                    prompt: 'Write an intense, gritty scene between two rival hackers in a neon-lit rainstorm with authentic dialogue.'
                  },
                  {
                    icon: <Sparkles size={16} className="text-amber-400" />,
                    title: 'Explain Complex Concept',
                    prompt: 'Explain how Transformers and Attention mechanisms work mathematically and intuitively with visual analogies.'
                  },
                  {
                    icon: <ImageIcon size={16} className="text-blue-400" />,
                    title: 'Photorealistic 35mm Visual',
                    prompt: '/image 35mm photograph of a lonely detective standing in a rain-slicked Tokyo alleyway, neon light reflection, Kodak Portra 400'
                  }
                ].map((card, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(card.prompt)}
                    className="p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-left transition-all hover:scale-[1.01] group flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-zinc-200">
                      {card.icon}
                      <span>{card.title}</span>
                    </div>
                    <p className="text-[12px] text-zinc-400 line-clamp-2 leading-relaxed group-hover:text-zinc-300">
                      {card.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Message List
            <div className="max-w-3xl mx-auto space-y-6">
              {activeConversation.messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 md:gap-4 ${
                      isUser ? 'justify-end' : 'justify-start'
                    } group`}
                  >
                    {/* Assistant Avatar */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 font-bold flex-shrink-0 shadow-md shadow-amber-500/10 mt-1">
                        ⚡
                      </div>
                    )}

                    {/* Message Body */}
                    <div className={`max-w-[85%] md:max-w-[80%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                      {/* Message Metadata Header */}
                      <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-500">
                        <span className="font-medium text-zinc-400">
                          {isUser ? 'You' : msg.model_name || selectedModel}
                        </span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl p-4 md:p-5 text-sm md:text-base leading-relaxed ${
                          isUser
                            ? 'bg-amber-500 text-zinc-950 font-medium rounded-tr-none shadow-md shadow-amber-500/10'
                            : msg.error
                            ? 'bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-tl-none w-full'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-none shadow-sm w-full'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <MarkdownRenderer content={msg.content} />
                        )}

                        {/* Inline Generated Image (If requested) */}
                        {msg.image && (
                          <div className="mt-4 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950">
                            {msg.image.url ? (
                              <div className="relative group">
                                <img
                                  src={msg.image.url}
                                  alt="Generated Visual"
                                  className="w-full max-h-[460px] object-cover cursor-zoom-in"
                                  onClick={() => setLightboxImage(msg.image?.url || null)}
                                />
                                <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
                                  <span className="truncate pr-2 font-mono text-[11px] text-zinc-400">
                                    {msg.image.prompt || 'Photorealistic 35mm'}
                                  </span>
                                  <a
                                    href={msg.image.url}
                                    download="generated_photo.jpg"
                                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                                    title="Download Image"
                                  >
                                    <Download size={14} />
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 text-xs text-amber-400 flex items-center gap-2">
                                <AlertCircle size={15} />
                                <span>Image rendering completed at: {msg.image.local_path}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Message Action Bar (Copy, etc.) */}
                      {!isUser && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs flex items-center gap-1"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span className="text-emerald-400 text-[11px]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span className="text-[11px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold flex-shrink-0 mt-1">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Generating / Typing Indicator */}
              {isGenerating && (
                <div className="flex gap-3 md:gap-4 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold flex-shrink-0 animate-pulse">
                    ⚡
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-zinc-400 ml-2 font-mono">
                      {imageMode ? 'Synthesizing photorealistic visual...' : `${selectedModel} is thinking...`}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 3. Bottom Chat Input Area (Claude & ChatGPT Floating Pill) */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-[#0a0d14] via-[#0a0d14]/90 to-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-amber-500/50 transition-all">
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  imageMode
                    ? 'Describe the 35mm photo you want to generate...'
                    : `Message ${selectedModel.split(':')[0]}... (Shift+Enter for newline)`
                }
                className="w-full bg-transparent text-white placeholder-zinc-500 px-4 pt-3.5 pb-12 rounded-2xl resize-none focus:outline-none text-sm md:text-base leading-relaxed max-h-48"
              />

              {/* Bottom Toolbar inside the pill */}
              <div className="absolute left-3 right-3 bottom-2.5 flex items-center justify-between pointer-events-none">
                {/* Left: Image Mode Toggle */}
                <div className="pointer-events-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setImageMode(!imageMode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                      imageMode
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Generate photorealistic image with Flux"
                  >
                    <ImageIcon size={14} />
                    <span>{imageMode ? 'Photo Mode ON' : 'Image Mode'}</span>
                  </button>

                  <span className="hidden sm:inline text-[11px] text-zinc-500">
                    or type <code className="text-zinc-400">/image</code>
                  </span>
                </div>

                {/* Right: Send Button */}
                <div className="pointer-events-auto flex items-center gap-2">
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isGenerating}
                    className={`p-2 rounded-xl transition-all ${
                      inputMessage.trim() && !isGenerating
                        ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 hover:scale-105'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                    title="Send message (Enter)"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] text-zinc-500 mt-2">
              Runs locally on your GTX 1650 with Ollama • 100% Uncensored, Private & Offline
            </p>
          </div>
        </div>
      </main>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-1.5 text-zinc-400 hover:text-white"
            >
              <X size={24} />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged view"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-zinc-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
