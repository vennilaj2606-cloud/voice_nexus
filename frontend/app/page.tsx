'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import CallTestModal from '@/components/CallTestModal';
import { PhoneCall, Users, CalendarCheck, Clock, TrendingUp, Sparkles, ArrowUpRight } from 'lucide-react';

export default function DashboardPage() {
  const [isCallTestOpen, setIsCallTestOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <main className="p-8 space-y-8 flex-1">
          {/* Header Banner */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-2">
                <span>Executive Dashboard</span>
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </h1>
              <p className="text-slate-400 text-sm mt-1">Real-time telemetry and Voice AI agent performance summary.</p>
            </div>
            <button 
              onClick={() => setIsCallTestOpen(true)}
              className="gradient-bg px-5 py-2.5 rounded-xl font-medium text-sm text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 animate-pulse" />
              <span>Launch Call Test</span>
            </button>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Calls</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">1,248</div>
              <div className="flex items-center text-xs text-emerald-400 font-medium space-x-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+14.2% from last week</span>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leads Captured</span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">342</div>
              <div className="flex items-center text-xs text-emerald-400 font-medium space-x-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+8.7% conversion</span>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appointments</span>
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">186</div>
              <div className="flex items-center text-xs text-emerald-400 font-medium space-x-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>94% confirmation rate</span>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Latency</span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">410ms</div>
              <div className="flex items-center text-xs text-emerald-400 font-medium space-x-1">
                <span>Sub-second AI response</span>
              </div>
            </div>
          </div>

          {/* Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Calls Panel */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h2 className="font-semibold text-lg text-white">Recent AI Call Activity</h2>
                <span className="text-xs text-indigo-400 hover:underline cursor-pointer flex items-center space-x-1">
                  <span>View All</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              
              <div className="space-y-3">
                {[
                  { caller: "+1 (555) 234-8901", duration: "2m 14s", status: "Appointment Booked", sentiment: "Positive", time: "5 mins ago" },
                  { caller: "+1 (555) 987-6543", duration: "1m 45s", status: "Lead Captured", sentiment: "Neutral", time: "18 mins ago" },
                  { caller: "+1 (555) 456-7890", duration: "3m 05s", status: "Transferred to Human", sentiment: "Positive", time: "42 mins ago" },
                  { caller: "+1 (555) 111-2233", duration: "0m 52s", status: "FAQ Answered", sentiment: "Positive", time: "1 hour ago" },
                ].map((call, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-semibold text-sm">
                        AI
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{call.caller}</div>
                        <div className="text-xs text-slate-400">Duration: {call.duration} • {call.time}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {call.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Agent Status Panel */}
            {/* <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
              <h2 className="font-semibold text-lg text-white">Active AI Voice Agent</h2>
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                  <span className="font-semibold text-sm text-indigo-200">Apex Realty Sales Agent</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Active Industry: <span className="font-medium text-white">Real Estate</span><br />
                  STT Engine: <span className="font-medium text-white">Deepgram Nova-2</span><br />
                  TTS Engine: <span className="font-medium text-white">ElevenLabs Turbo v2</span><br />
                  LLM Model: <span className="font-medium text-white">GPT-4o Streaming</span>
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick System Actions</h3>
                <button 
                  onClick={() => setIsCallTestOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 flex items-center justify-between transition-colors"
                >
                  <span>Test Voice Prompt Live</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                </button>
                <button 
                  onClick={() => setIsCallTestOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 flex items-center justify-between transition-colors"
                >
                  <span>Launch Simulator Modal</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              </div>
            </div> */}
          </div>
        </main>
      </div>

      {/* Interactive Call Test Modal */}
      <CallTestModal 
        isOpen={isCallTestOpen} 
        onClose={() => setIsCallTestOpen(false)} 
      />
    </div>
  );
}
