'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { Users, UserPlus, Search, Phone, Mail } from 'lucide-react';

export default function LeadsPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <main className="p-8 space-y-8 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">CRM Leads Management</h1>
              <p className="text-slate-400 text-sm mt-1">Leads automatically captured by Voice AI callers during telephone conversations.</p>
            </div>
            <button className="gradient-bg px-5 py-2.5 rounded-xl font-medium text-sm text-white shadow-lg shadow-indigo-500/25 flex items-center space-x-2">
              <UserPlus className="w-4 h-4" />
              <span>Add Manual Lead</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Sarah Jenkins", phone: "+1 (555) 234-8901", email: "sarah.j@example.com", status: "Appointment Scheduled", source: "Apex Realty AI" },
              { name: "Michael Chang", phone: "+1 (555) 987-6543", email: "m.chang@example.com", status: "New Lead", source: "Restaurant AI" },
              { name: "Emily Watson", phone: "+1 (555) 456-7890", email: "emily.w@example.com", status: "Contacted", source: "Support AI" },
            ].map((lead, idx) => (
              <div key={idx} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    {lead.name[0]}
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {lead.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-lg text-white">{lead.name}</h3>
                  <p className="text-xs text-slate-400">Captured via {lead.source}</p>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lead.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lead.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
