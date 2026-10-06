'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { Settings, Key, Phone, ShieldCheck, Copy } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <main className="p-8 space-y-8 flex-1">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-2">
              <Settings className="w-7 h-7 text-indigo-400" />
              <span>Multi-Tenant SaaS Settings & API Keys</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage organization tenant parameters, telephony integrations, and API authentication credentials.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="font-semibold text-lg text-white flex items-center space-x-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <span>Organization API Keys</span>
              </h2>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant API Secret Token</label>
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <input
                    type="password"
                    value="vn_live_983274983274982374982374928"
                    readOnly
                    className="flex-1 bg-transparent text-sm text-slate-200 outline-none"
                  />
                  <button className="text-indigo-400 hover:text-indigo-300 p-1">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="font-semibold text-lg text-white flex items-center space-x-2">
                <Phone className="w-5 h-5 text-indigo-400" />
                <span>Telephony Provider Webhooks</span>
              </h2>

              <div className="space-y-3">
                <div className="text-xs text-slate-400">Telnyx / Twilio Webhook Target URL:</div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-indigo-300">
                  https://app.voicenexus.ai/api/v1/webhooks/telnyx/incoming
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
