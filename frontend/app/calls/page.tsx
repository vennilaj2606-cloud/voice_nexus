'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { PhoneCall, FileText, Play, Download, Search } from 'lucide-react';

export default function CallsPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <main className="p-8 space-y-8 flex-1">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Call History & Recording Logs</h1>
            <p className="text-slate-400 text-sm mt-1">Audit complete telephony logs, audio recordings, and AI turn transcripts.</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 w-72">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by caller number..."
                  className="bg-transparent text-xs text-slate-200 outline-none w-full"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                    <th className="py-3 px-4 font-semibold">Caller Number</th>
                    <th className="py-3 px-4 font-semibold">Direction</th>
                    <th className="py-3 px-4 font-semibold">Duration</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Recording</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {[
                    { number: "+1 (555) 234-8901", dir: "Inbound", dur: "2m 14s", status: "Completed", date: "2026-09-24 10:14" },
                    { number: "+1 (555) 987-6543", dir: "Inbound", dur: "1m 45s", status: "Completed", date: "2026-09-24 09:50" },
                    { number: "+1 (555) 456-7890", dir: "Outbound", dur: "3m 05s", status: "Transferred", date: "2026-09-24 08:30" },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-4 px-4 font-semibold text-slate-200">{row.number}</td>
                      <td className="py-4 px-4 text-slate-400">{row.dir}</td>
                      <td className="py-4 px-4 text-slate-400">{row.dur}</td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {row.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button className="flex items-center space-x-1 text-xs text-indigo-400 hover:underline">
                          <Play className="w-3.5 h-3.5" />
                          <span>Play Audio</span>
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300">
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
