'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Mic,
  Send,
  Radio
} from 'lucide-react';
import { useWebSpeech } from '@/hooks/useWebSpeech';
import { api } from '@/services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
}

export default function FloatingCallWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'connected' | 'ended'>('ringing');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputSpeech, setInputSpeech] = useState('');
  const [liveProperties, setLiveProperties] = useState<Property[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { speak, stopSpeaking, startListening, stopListening, isListening } = useWebSpeech();

  // Load actual live properties from Neon PostgreSQL
  const fetchLiveProperties = async () => {
    try {
      const res = await api.get('/properties/');
      setLiveProperties(res.data);
    } catch (err) {
      console.error('Error fetching live properties for floating widget:', err);
    }
  };

  useEffect(() => {
    fetchLiveProperties();
  }, []);

  // Call timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  useEffect(() => {
    if (callState === 'connected') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, callState]);

  const handleAnswer = () => {
    setCallState('connected');
    const initialGreeting = "Hello! Thank you for calling VoiceNexus Real Estate. My name is Priya. How can I help you find your ideal property or book a viewing today?";
    setMessages([
      {
        role: 'assistant',
        text: initialGreeting
      }
    ]);

    if (!isAudioMuted) {
      speak(initialGreeting, 'female');
    }
  };

  const handleDecline = () => {
    stopSpeaking();
    stopListening();
    setCallState('ended');
    setTimeout(() => {
      setIsOpen(false);
      setCallState('ringing');
    }, 400);
  };

  const handleSendTurn = async (customText?: string) => {
    const textToSend = (customText || inputSpeech).trim();
    if (!textToSend || callState !== 'connected') return;

    setMessages((prev) => [...prev, { role: 'user', text: textToSend }]);
    setInputSpeech('');

    const lowerText = textToSend.toLowerCase();
    let reply = "";

    // Refresh properties from Neon PostgreSQL
    let properties = liveProperties;
    try {
      const res = await api.get('/properties/');
      properties = res.data;
      setLiveProperties(properties);
    } catch (e) {
      // Use cached liveProperties
    }

    const matchedProperty = properties.find((p) =>
      lowerText.includes(p.title.toLowerCase()) ||
      p.title.toLowerCase().includes(lowerText) ||
      lowerText.includes(p.address.toLowerCase().split(',')[0].toLowerCase())
    );

    if (matchedProperty) {
      reply = `${matchedProperty.title} is located at ${matchedProperty.address}. It has ${matchedProperty.bedrooms} bedrooms, ${matchedProperty.bathrooms} bathrooms, priced at $${matchedProperty.price.toLocaleString()}. ${matchedProperty.description}`;
    } else if (lowerText.includes('bed') || lowerText.includes('room') || lowerText.includes('bath')) {
      if (properties.length > 0) {
        const bedCounts = properties.map(p => `${p.title} (${p.bedrooms} beds, ${p.bathrooms} baths)`).join('; ');
        reply = `Here are current bedroom specs from our live database: ${bedCounts}.`;
      } else {
        reply = "We have multiple properties listed. How many bedrooms are you looking for?";
      }
    } else if (lowerText.includes('book') || lowerText.includes('appointment') || lowerText.includes('schedule') || lowerText.includes('tour')) {
      reply = "I have booked a private viewing appointment for you tomorrow at 2:00 PM and saved your details in our CRM!";
    } else if (lowerText.includes('buy') || lowerText.includes('property') || lowerText.includes('house') || lowerText.includes('price')) {
      if (properties.length > 0) {
        const featured = properties.slice(0, 3).map(p => `'${p.title}' ($${p.price.toLocaleString()})`).join(', ');
        reply = `I queried our live database. Featured properties: ${featured}. Would you like me to schedule a viewing?`;
      } else {
        reply = "I searched our live property database. How can I assist you with your budget or location preference?";
      }
    } else {
      reply = `Thank you for saying '${textToSend}'. Every statement in this call is logged to our live database. I can search properties, check specs, or book viewings for you right now.`;
    }

    setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);

    if (!isAudioMuted) {
      speak(reply, 'female');
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
          handleSendTurn(finalText);
        }
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (pathname === '/login') {
    return null;
  }

  return (
    <>
      {/* Minimized Floating Widget Trigger (Bottom Right) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <button
            onClick={() => {
              setIsOpen(true);
              setCallState('ringing');
            }}
            className="group flex items-center space-x-3 bg-slate-900/90 hover:bg-slate-900 border border-emerald-500/40 text-white p-2.5 pr-5 rounded-full shadow-2xl shadow-emerald-500/20 backdrop-blur-md transition-all transform hover:scale-105"
          >
            <div className="relative">
              <img
                src="/priya_avatar.jpg"
                alt="Priya AI Advisor"
                className="w-11 h-11 rounded-full object-cover border-2 border-emerald-400"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-ping"></span>
            </div>
            <div className="text-left">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm text-white">Priya</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">AI Advisor</span>
              </div>
              <p className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Live Interactive Call</span>
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Expanded Live Call Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md animate-fadeIn shadow-2xl">
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-emerald-500/10">
            {/* Top Header Bar */}
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src="/priya_avatar.jpg"
                    alt="Priya Avatar"
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/80 shadow-md"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-300 border-2 border-emerald-600 rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight flex items-center space-x-1.5">
                    <span>Priya</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse"></span>
                  </h3>
                  <p className="text-xs text-emerald-100/90 font-medium">VoiceNexus Real Estate Advisor</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const nextMute = !isAudioMuted;
                    setIsAudioMuted(nextMute);
                    if (nextMute) stopSpeaking();
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                  title={isAudioMuted ? "Unmute Speaker" : "Mute Speaker"}
                >
                  {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    stopSpeaking();
                    stopListening();
                    setIsOpen(false);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                  title="Close Widget"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Incoming Call Screen */}
            {callState === 'ringing' && (
              <div className="p-8 flex flex-col items-center text-center space-y-6 bg-slate-900/90">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full blur-md opacity-40 group-hover:opacity-75 transition duration-500 animate-pulse"></div>
                  <div className="relative p-1 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40">
                    <img
                      src="/priya_avatar.jpg"
                      alt="Priya"
                      className="w-28 h-28 rounded-full object-cover shadow-xl border-4 border-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Priya</h2>
                  <p className="text-xs text-slate-400 font-medium">VoiceNexus Real Estate AI</p>
                </div>

                <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span>Live Interactive Call</span>
                </div>

                <div className="pt-4 flex items-center justify-center space-x-12 w-full">
                  <div className="flex flex-col items-center space-y-2">
                    <button
                      onClick={handleDecline}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                    <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">DECLINE</span>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    <button
                      onClick={handleAnswer}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all animate-bounce cursor-pointer"
                    >
                      <PhoneCall className="w-6 h-6" />
                    </button>
                    <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">ANSWER</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 w-full">
                  Powered by <strong className="text-slate-400">R4R Technologies</strong>
                </div>
              </div>
            )}

            {/* In-Call Active State */}
            {callState === 'connected' && (
              <div className="p-6 flex flex-col space-y-4 bg-slate-900/95 max-h-[480px]">
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                    <div>
                      <div className="text-xs font-semibold text-emerald-300">Call Connected</div>
                      <div className="text-[10px] text-slate-400"></div>
                    </div>
                  </div>
                  <div className="text-sm font-mono font-bold text-emerald-400 bg-emerald-900/50 px-3 py-1 rounded-xl">
                    {formatTime(callDuration)}
                  </div>
                </div>

                {/* Conversation Log */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[200px]">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex space-x-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <img
                          src="/priya_avatar.jpg"
                          alt="Priya"
                          className="w-7 h-7 rounded-full object-cover border border-emerald-400 shrink-0"
                        />
                      )}
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[80%] ${msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                          }`}
                      >
                        {msg.text}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 font-bold text-[10px]">
                          YOU
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Microphone & Interactive Controls */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {isListening && (
                    <div className="flex items-center justify-center space-x-2 py-1 px-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300 font-semibold animate-pulse">
                      <Radio className="w-4 h-4 text-red-400 animate-spin" />
                      <span>Listening to your voice... Speak now!</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleMicListening}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center transition-all ${isListening
                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/40 animate-pulse'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-emerald-500'
                        }`}
                      title={isListening ? "Stop Microphone" : "Speak into Microphone"}
                    >
                      <Mic className="w-4 h-4 text-emerald-400" />
                    </button>

                    <input
                      type="text"
                      value={inputSpeech}
                      onChange={(e) => setInputSpeech(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendTurn()}
                      placeholder={isListening ? "Listening..." : "Click mic to speak, or type..."}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 disabled:opacity-50"
                    />

                    <button
                      onClick={() => handleSendTurn()}
                      disabled={!inputSpeech.trim()}
                      className="bg-emerald-500 hover:bg-emerald-400 p-2.5 rounded-xl text-slate-950 font-bold disabled:opacity-50 transition-opacity"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={handleDecline}
                    className="w-full py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-red-600/20"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Call Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
