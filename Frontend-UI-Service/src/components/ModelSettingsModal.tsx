import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Image as ImageIcon, Save, Check, RefreshCw } from 'lucide-react';
import { ServiceConfig } from '../types/story';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const ModelSettingsModal: React.FC<Props> = ({ isOpen, onClose, onConfigSaved }) => {
  const [config, setConfig] = useState<ServiceConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const cfg = await api.getConfig();
      setConfig(cfg);
    } catch (err: any) {
      setError(err.message || 'Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      setLoading(true);
      await api.updateConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onConfigSaved) onConfigSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save config');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-noir-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-slate-100 cinzel">
            Pluggable Model Architecture Settings
          </h2>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Seamlessly switch between local inference (Ollama, LM Studio) or cloud providers without code changes.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {config && (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Text Model Section */}
            <div className="space-y-3 bg-noir-900/60 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <Cpu className="w-4 h-4" />
                Text Model Factory (LLM)
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Provider</label>
                  <select
                    value={config.text_model.provider}
                    onChange={e => setConfig({
                      ...config,
                      text_model: { ...config.text_model, provider: e.target.value }
                    })}
                    className="w-full bg-noir-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                  >
                    <option value="ollama">Ollama (Local)</option>
                    <option value="lmstudio">LM Studio (Local)</option>
                    <option value="openai">OpenAI (Cloud)</option>
                    <option value="vllm">vLLM / Local OpenAI</option>
                    <option value="mock">Offline / Mock Demo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Model Name</label>
                  <input
                    type="text"
                    value={config.text_model.model_name}
                    onChange={e => setConfig({
                      ...config,
                      text_model: { ...config.text_model, model_name: e.target.value }
                    })}
                    className="w-full bg-noir-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                    placeholder="qwen2.5:3b, gpt-4o-mini"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Base URL</label>
                <input
                  type="text"
                  value={config.text_model.base_url || ''}
                  onChange={e => setConfig({
                    ...config,
                    text_model: { ...config.text_model, base_url: e.target.value }
                  })}
                  className="w-full bg-noir-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono text-[11px]"
                  placeholder="http://localhost:11434"
                />
              </div>

              {config.text_model.provider === 'openai' && (
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">OpenAI API Key</label>
                  <input
                    type="password"
                    value={config.text_model.api_key || ''}
                    onChange={e => setConfig({
                      ...config,
                      text_model: { ...config.text_model, api_key: e.target.value }
                    })}
                    className="w-full bg-noir-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono text-[11px]"
                    placeholder="sk-..."
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Temperature</span>
                  <span>{config.text_model.temperature || 0.8}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.2"
                  step="0.05"
                  value={config.text_model.temperature || 0.8}
                  onChange={e => setConfig({
                    ...config,
                    text_model: { ...config.text_model, temperature: parseFloat(e.target.value) }
                  })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* Image Model Section */}
            <div className="space-y-3 bg-noir-900/60 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <ImageIcon className="w-4 h-4" />
                Image Engine Factory (Diffusion)
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Provider</label>
                  <select
                    value={config.image_model.provider}
                    onChange={e => setConfig({
                      ...config,
                      image_model: { ...config.image_model, provider: e.target.value }
                    })}
                    className="w-full bg-noir-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                  >
                    <option value="pollinations">Pollinations (Flux - Zero Setup)</option>
                    <option value="sd_webui">Local SD-WebUI / Forge</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Engine Model</label>
                  <input
                    type="text"
                    value={config.image_model.model_name}
                    onChange={e => setConfig({
                      ...config,
                      image_model: { ...config.image_model, model_name: e.target.value }
                    })}
                    className="w-full bg-noir-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                    placeholder="flux, turbo"
                  />
                </div>
              </div>

              {config.image_model.provider === 'sd_webui' && (
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">SD-WebUI URL</label>
                  <input
                    type="text"
                    value={config.image_model.base_url || 'http://127.0.0.1:7860'}
                    onChange={e => setConfig({
                      ...config,
                      image_model: { ...config.image_model, base_url: e.target.value }
                    })}
                    className="w-full bg-noir-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono text-[11px]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-noir-900 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {saved ? <Check className="w-4 h-4 text-emerald-950" /> : <Save className="w-4 h-4" />}
                <span>{saved ? 'Saved Successfully!' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
