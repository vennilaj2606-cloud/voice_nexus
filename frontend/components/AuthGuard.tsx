'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const isAuthRoute = pathname === '/login';

    if (!token && !isAuthRoute) {
      router.replace('/login');
    } else if (token && isAuthRoute) {
      router.replace('/');
    }
  }, [isClient, token, pathname, router]);

  // While checking hydration, render a sleek loader if trying to access protected route
  if (!isClient) {
    return null;
  }

  if (!token && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">Authenticating...</p>
      </div>
    );
  }

  return <>{children}</>;
}
