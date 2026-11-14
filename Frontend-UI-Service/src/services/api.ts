import { StoryState, StoryListItem, ServiceConfig } from '../types/story';

const WORKFLOW_BASE = '/api/workflow';
const LLM_BASE = '/api';

export const api = {
  // Story Sessions
  async listStories(): Promise<StoryListItem[]> {
    const res = await fetch(`${WORKFLOW_BASE}/stories`);
    if (!res.ok) throw new Error('Failed to fetch stories');
    return res.json();
  },

  async getStory(sessionId: string): Promise<StoryState> {
    const res = await fetch(`${WORKFLOW_BASE}/story/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch story details');
    return res.json();
  },

  async startStory(concept: string, genreTone?: string, autoGenerateFirst: boolean = false): Promise<StoryState> {
    const res = await fetch(`${WORKFLOW_BASE}/story/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_concept: concept,
        genre_tone: genreTone,
        auto_generate_first_beat: autoGenerateFirst
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to start story' }));
      throw new Error(err.detail || 'Failed to start story');
    }
    return res.json();
  },

  async nextBeat(sessionId: string, customGuidance?: string): Promise<StoryState> {
    const res = await fetch(`${WORKFLOW_BASE}/story/${sessionId}/next-beat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_guidance: customGuidance })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to generate beat' }));
      throw new Error(err.detail || 'Failed to generate beat');
    }
    return res.json();
  },

  async regenerateBeat(sessionId: string, actNumber: number, customGuidance?: string): Promise<StoryState> {
    const res = await fetch(`${WORKFLOW_BASE}/story/${sessionId}/regenerate-beat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        act_number: actNumber,
        custom_guidance: customGuidance
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to regenerate beat' }));
      throw new Error(err.detail || 'Failed to regenerate beat');
    }
    return res.json();
  },

  async runAutopilot(sessionId: string): Promise<StoryState> {
    const res = await fetch(`${WORKFLOW_BASE}/story/${sessionId}/autopilot`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Autopilot failed' }));
      throw new Error(err.detail || 'Autopilot failed');
    }
    return res.json();
  },

  async sendChatMessage(sessionId: string, message: string): Promise<{ reply: string; chat_history: any[] }> {
    const res = await fetch(`${WORKFLOW_BASE}/story/${sessionId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error('Chat failed');
    return res.json();
  },

  async deleteStory(sessionId: string): Promise<void> {
    await fetch(`${WORKFLOW_BASE}/story/${sessionId}`, { method: 'DELETE' });
  },

  // Model & System Configuration
  async getConfig(): Promise<ServiceConfig> {
    const res = await fetch(`${LLM_BASE}/config`);
    if (!res.ok) throw new Error('Failed to load configuration');
    return res.json();
  },

  async updateConfig(update: Partial<ServiceConfig>): Promise<{ status: string; config: ServiceConfig }> {
    const res = await fetch(`${LLM_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    if (!res.ok) throw new Error('Failed to update config');
    return res.json();
  },

  async checkHealth(): Promise<{ llm: boolean; workflow: boolean }> {
    let llm = false;
    let workflow = false;
    try {
      const r1 = await fetch('/api/config');
      if (r1.ok) llm = true;
    } catch {}
    try {
      const r2 = await fetch(`${WORKFLOW_BASE}/stories`);
      if (r2.ok) workflow = true;
    } catch {}
    return { llm, workflow };
  },

  // General Chat (ChatGPT / Claude Style)
  async generalChat(params: {
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
    system_instruction?: string;
    model_name?: string;
    provider?: string;
    temperature?: number;
    generate_image?: boolean;
  }): Promise<{
    status: string;
    message: string;
    model_name?: string;
    provider?: string;
    image?: any;
    warning?: string;
  }> {
    const res = await fetch(`${LLM_BASE}/llm/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to generate response' }));
      throw new Error(err.detail || 'Failed to generate response');
    }
    return res.json();
  },

  async getAvailableModels(): Promise<{
    local_models: Array<{ name: string; size: number; parameter_size: string; provider: string }>;
    presets: Array<{ id: string; name: string; description: string; prompt: string }>;
  }> {
    const res = await fetch(`${LLM_BASE}/llm/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    return res.json();
  }
};
