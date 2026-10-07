'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  PhoneCall, 
  Radio, 
  Users, 
  Building2, 
  Calendar, 
  Sparkles, 
  BookOpen, 
  BarChart3, 
  Settings,
  LogOut 
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Live Calls', href: '/livecalls', icon: Radio },
  // { name: 'Live Calls', href: '/live-calls', icon: Radio },
  { name: 'Call History', href: '/calls', icon: PhoneCall },
  { name: 'Leads & CRM', href: '/leads', icon: Users },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'AI Prompts', href: '/prompts', icon: Sparkles },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="w-64 glass-panel h-screen flex flex-col fixed left-0 top-0 z-40 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800/60">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <PhoneCall className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-wide gradient-text">R4R AI</h1>
          <p className="text-xs text-slate-400">Enterprise Voice SaaS</p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile & Logout */}
      <div className="p-4 border-t border-slate-800/60 space-y-2">
        {mounted && user && (
          <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
              {user.full_name ? user.full_name.charAt(0) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.full_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
