'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { api } from '@/services/api';
import { Sparkles, Save, Sliders, Check, RefreshCw, Layers } from 'lucide-react';

interface AIPrompt {
  id: string;
  name: string;
  industry: string;
  system_prompt: string;
  greeting: string;
  voice_settings: {
    speed: number;
    stability: number;
  };
  is_default: boolean;
}

const INDUSTRY_PRESETS = {
  real_estate: {
    name: 'Real Estate Sales Assistant',
    greeting: "Hello! Thank you for calling VoiceNexus Real Estate. My name is Nexus. Are you looking to buy, sell, or view a property today?",
    systemPrompt: "You are Nexus, an elite, friendly, and professional Real Estate Voice AI Assistant for R4R AI.\nYour job is to assist callers in finding properties, scheduling property viewings, answering questions about pricing and specs, and capturing lead details."
  },
  restaurant: {
    name: 'Restaurant Reservation Assistant',
    greeting: "Welcome to Bella Italia! I am your AI dining assistant. Would you like to reserve a table or inquire about today's special menu?",
    systemPrompt: "You are an AI reservation assistant for a high-end Italian restaurant.\nAssist callers in booking table reservations, providing menu recommendations, and noting dietary preferences."
  },
  car_sales: {
    name: 'Automotive Sales Assistant',
    greeting: "Hello and thank you for calling Apex Auto Sales! How can I help you find your next vehicle or schedule a test drive today?",
    systemPrompt: "You are an automotive sales specialist voice agent.\nAssist callers with inventory searches, pricing inquiries, trade-in options, and scheduling test drive appointments."
  },
  healthcare: {
    name: 'Healthcare Clinic Receptionist',
    greeting: "Thank you for calling CareFirst Medical Clinic. How can I assist you with appointment scheduling or general clinic info today?",
    systemPrompt: "You are a professional medical clinic receptionist voice agent.\nHelp patients schedule consultations, check clinic hours, and gather initial appointment details with high empathy."
  },
  support: {
    name: 'Customer Support & Lead Desk',
    greeting: "Hello! Thank you for calling Customer Support. How can I assist you with your account or technical inquiry today?",
    systemPrompt: "You are a senior customer support and lead qualification voice agent.\nAnswer common customer questions, troubleshoot issues, and escalate urgent issues to human specialists."
  }
};

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [industry, setIndustry] = useState<keyof typeof INDUSTRY_PRESETS>('real_estate');
  const [name, setName] = useState('Real Estate Sales Assistant');
  const [greeting, setGreeting] = useState(INDUSTRY_PRESETS.real_estate.greeting);
  const [systemPrompt, setSystemPrompt] = useState(INDUSTRY_PRESETS.real_estate.systemPrompt);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voiceStability, setVoiceStability] = useState(0.5);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch prompts from PostgreSQL
  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/prompts/');
      const data: AIPrompt[] = response.data;
      setPrompts(data);

      if (data.length > 0) {
        const active = data[0];
        setActivePromptId(active.id);
        setName(active.name);
        setIndustry(active.industry as any || 'real_estate');
        setGreeting(active.greeting);
        setSystemPrompt(active.system_prompt);
        if (active.voice_settings) {
          setVoiceSpeed(active.voice_settings.speed || 1.0);
          setVoiceStability(active.voice_settings.stability || 0.5);
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleIndustryChange = (selectedKey: keyof typeof INDUSTRY_PRESETS) => {
    setIndustry(selectedKey);
    const preset = INDUSTRY_PRESETS[selectedKey];
    setName(preset.name);
    setGreeting(preset.greeting);
    setSystemPrompt(preset.systemPrompt);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name,
      industry,
      greeting,
      system_prompt: systemPrompt,
      voice_settings: {
        speed: voiceSpeed,
        stability: voiceStability
      }
    };

    try {
      if (activePromptId) {
        // Update existing prompt in PostgreSQL
        await api.put(`/prompts/${activePromptId}`, payload);
        showNotification('AI Prompt updated in Neon PostgreSQL!');
      } else {
        // Create new prompt in PostgreSQL
        const res = await api.post('/prompts/', payload);
        setActivePromptId(res.data.id);
        showNotification('New AI Prompt configuration saved to PostgreSQL!');
      }
      fetchPrompts();
    } catch (err) {
      console.error('Failed to save AI prompt:', err);
      showNotification('Error saving AI prompt configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />

        <main className="p-8 space-y-8 flex-1">
          {/* Notification Toast */}
          {notification && (
            <div className="fixed top-20 right-8 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-indigo-400/30 animate-bounce">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">{notification}</span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
                <Sparkles className="w-8 h-8 text-indigo-400" />
                <span>AI Prompt Manager & Agent Personality</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Configure voice agent prompts, industry guardrails, phone greetings, and voice speed settings stored in PostgreSQL.
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="gradient-bg px-6 py-2.5 rounded-xl font-medium text-sm text-white shadow-lg shadow-indigo-500/25 flex items-center space-x-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save AI Configuration</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Prompt Form */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Industry Template Preset
                </label>
                <select
                  value={industry}
                  onChange={(e) => handleIndustryChange(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="real_estate">Real Estate Sales Assistant</option>
                  <option value="restaurant">Restaurant Reservation Assistant</option>
                  <option value="car_sales">Automotive Sales Assistant</option>
                  <option value="healthcare">Healthcare Clinic Receptionist</option>
                  <option value="support">Customer Support & Lead Desk</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Prompt Profile Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Opening Phone Greeting (Spoken via TTS on Call Start)
                </label>
                <input
                  type="text"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  System Instructions & AI Guardrails
                </label>
                <textarea
                  rows={9}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-indigo-500 leading-relaxed font-mono transition-colors"
                />
              </div>
            </div>

            {/* Sidebar Voice Controls */}
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
                <h2 className="font-semibold text-lg text-white flex items-center space-x-2 border-b border-slate-800/80 pb-4">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <span>Voice & Speech Parameters</span>
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      TTS Voice Model
                    </label>
                    <select className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none">
                      <option>ElevenLabs - Rachel (Warm & Professional)</option>
                      <option>ElevenLabs - Adam (Deep & Trustworthy)</option>
                      <option>ElevenLabs - Bella (Soft & Friendly)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      STT Model
                    </label>
                    <select className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none">
                      <option>Deepgram Nova-2 Telephony (Low-Latency)</option>
                      <option>Whisper V3 Real-time</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Speech Speed ({voiceSpeed}x)
                      </label>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.3}
                      step={0.05}
                      value={voiceSpeed}
                      onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Voice Stability ({voiceStability})
                      </label>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={voiceStability}
                      onChange={(e) => setVoiceStability(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Saved Configurations List */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Saved Prompts in Database ({prompts.length})</span>
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {prompts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActivePromptId(p.id);
                        setName(p.name);
                        setIndustry(p.industry as any || 'real_estate');
                        setGreeting(p.greeting);
                        setSystemPrompt(p.system_prompt);
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${activePromptId === p.id
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-medium'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <div className="font-semibold text-slate-200">{p.name}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{p.industry}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
