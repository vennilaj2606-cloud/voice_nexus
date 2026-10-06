'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Search, UserCircle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="h-16 glass-panel border-b border-slate-800/60 sticky top-0 z-30 flex items-center justify-between px-8">
      {/* Search Input */}
      <div className="flex items-center space-x-3 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800 w-80">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search calls, leads, properties..."
          className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-full"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-6">
        <button className="relative text-slate-400 hover:text-slate-200">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full"></span>
        </button>

        <div className="flex items-center space-x-3 border-l border-slate-800 pl-6">
          <UserCircle className="w-8 h-8 text-indigo-400" />
          <div>
            <div className="text-sm font-semibold text-slate-200 flex items-center space-x-1">
              <span>{(mounted && user?.full_name) || 'Admin User'}</span>
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xs text-slate-400">{(mounted && user?.email) || 'admin@voicenexus.ai'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
