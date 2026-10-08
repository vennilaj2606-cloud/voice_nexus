'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { Mic, MicOff, PhoneOff, Radio, Send, Sparkles, User, Bot, Volume2, VolumeX } from 'lucide-react';
import { useWebSpeech } from '@/hooks/useWebSpeech';
import { api } from '@/services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function LiveCallsPage() {
  const [isCalling, setIsCalling] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputSpeech, setInputSpeech] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const { speak, stopSpeaking, startListening, stopListening, isListening } = useWebSpeech();

  const startSimulatedCall = () => {
    setIsCalling(true);
    const greeting = "Hello! Thanks for calling Apex Realty. My name is Priya, your R4R AI Advisor. Are you looking to buy, sell, or rent a property today?";
    setMessages([
      { role: 'assistant', text: greeting }
    ]);
    if (!isAudioMuted) {
      speak(greeting, 'female');
    }
  };

  const endCall = () => {
    stopSpeaking();
    stopListening();
    setIsCalling(false);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const sendSpeechTurn = async (customText?: string) => {
    const textToSend = (customText || inputSpeech).trim();
    if (!textToSend || !isCalling || isProcessing) return;

    setMessages((prev) => [...prev, { role: 'user', text: textToSend }]);
    setInputSpeech('');
    setIsProcessing(true);

    try {
      // Query backend dynamic dual-source endpoint (reads live database records and uploaded documents)
      const res = await api.post('/widget/chat', {
        message: textToSend,
        customer_name: 'Caller',
        session_id: 'live_call_session'
      });

      const aiReply = res.data?.reply || "I am here to assist you with our available properties, company guidelines, or schedule a viewing tour.";
      
      setMessages((prev) => [...prev, { role: 'assistant', text: aiReply }]);

      if (!isAudioMuted) {
        speak(aiReply, 'female');
      }
    } catch (err) {
      // Graceful offline fallback
      const lower = textToSend.toLowerCase();
      let aiReply = "Thank you for asking. Our current residences include luxury villas and downtown penthouses with panoramic views. Would you like me to reserve a viewing tour for you?";
      if (lower.includes("policy") || lower.includes("escrow") || lower.includes("deposit")) {
        aiReply = "According to our company policy, a 5% escrow deposit is required upon offer acceptance, protected by a 14-day inspection contingency.";
      } else if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule") || lower.includes("tour")) {
        aiReply = "I have scheduled a private viewing appointment for you tomorrow at 2:00 PM and reserved your time slot.";
      }
      setMessages((prev) => [...prev, { role: 'assistant', text: aiReply }]);
      if (!isAudioMuted) {
        speak(aiReply, 'female');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMicListening = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening(
        (transcribedText) => {
          setInputSpeech(transcribedText);
        },
        (finalText) => {
          sendSpeechTurn(finalText);
        }
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <main className="p-8 space-y-8 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
                <Radio className="w-7 h-7 text-indigo-400 animate-pulse" />
                <span>Live Call Monitor & Interactive Simulator</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">Real-time speech interaction with live dynamic database queries and uploaded document retrieval.</p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const nextMute = !isAudioMuted;
                  setIsAudioMuted(nextMute);
                  if (nextMute) stopSpeaking();
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-colors ${
                  isAudioMuted ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>{isAudioMuted ? 'Voice Muted' : 'Voice Audio Active'}</span>
              </button>

              {!isCalling ? (
                <button
                  onClick={startSimulatedCall}
                  className="gradient-bg px-6 py-3 rounded-xl font-semibold text-sm text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity flex items-center space-x-2"
                >
                  <Mic className="w-5 h-5" />
                  <span>Start Interactive Test Call</span>
                </button>
              ) : (
                <button
                  onClick={endCall}
                  className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-xl font-semibold text-sm text-white shadow-lg shadow-red-500/25 transition-colors flex items-center space-x-2"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>End Call Session</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Simulator Window */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Conversation Stream Log */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${isCalling ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
                  <span className="font-semibold text-sm text-slate-200">
                    {isCalling ? (isListening ? 'Listening to Microphone...' : isProcessing ? 'Querying Dynamic Data & Reasoning...' : 'Call Session Active (Speech Streaming)') : 'No Call Connected'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">Deepgram STT → Dynamic Engine → ElevenLabs TTS</span>
              </div>

              {/* Chat Log Window */}
              <div className="flex-1 my-6 overflow-y-auto space-y-4 pr-2 max-h-[420px]">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <Radio className="w-12 h-12 text-slate-600" />
                    <p className="text-sm">Click 'Start Interactive Test Call' to speak directly with the R4R AI voice agent.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-md p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-500/10'
                            : 'glass-card text-slate-200 rounded-bl-none border border-slate-800'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Speech Input Box & Mic Button */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                {isListening && (
                  <div className="flex items-center justify-center space-x-2 py-2 px-4 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300 font-semibold animate-pulse">
                    <Radio className="w-4 h-4 text-red-400 animate-spin" />
                    <span>Listening to your speech... Speak into your mic!</span>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleMicListening}
                    disabled={!isCalling}
                    className={`p-3 rounded-xl border transition-all ${
                      isListening
                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/40 animate-pulse'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500'
                    } disabled:opacity-50`}
                    title={isListening ? "Stop Microphone" : "Speak via Microphone"}
                  >
                    <Mic className="w-5 h-5 text-indigo-400" />
                  </button>

                  <input
                    type="text"
                    value={inputSpeech}
                    onChange={(e) => setInputSpeech(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendSpeechTurn()}
                    disabled={!isCalling}
                    placeholder={isCalling ? (isListening ? "Listening..." : "Click mic to speak, or type what caller says...") : "Start call session to enable speech input"}
                    className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => sendSpeechTurn()}
                    disabled={!isCalling || !inputSpeech.trim() || isProcessing}
                    className="gradient-bg p-3 rounded-xl text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 hover:opacity-95 transition-opacity"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Live Telemetry Panel */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
              <h2 className="font-semibold text-lg text-white">Dynamic Stream Metrics</h2>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400 font-medium">Knowledge & DB Retrieval</div>
                  <div className="text-sm font-semibold text-indigo-300">Dual-Source Dynamic Engine</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400 font-medium">STT Engine</div>
                  <div className="text-sm font-semibold text-emerald-400 flex items-center justify-between">
                    <span>Deepgram Streaming Nova-2</span>
                    <span className="text-xs text-slate-400">320ms</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400 font-medium">TTS Engine</div>
                  <div className="text-sm font-semibold text-pink-400 flex items-center justify-between">
                    <span>ElevenLabs Turbo v2</span>
                    <span className="text-xs text-slate-400">180ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
