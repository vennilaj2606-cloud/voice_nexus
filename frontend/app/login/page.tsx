'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneCall, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Building2, User, Sparkles, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fillDemoCredentials = () => {
    setEmail('admin@apexrealty.com');
    setPassword('password123');
    setErrorMessage(null);
  };

  const handleOrgNameChange = (val: string) => {
    setOrgName(val);
    setOrgSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: password
      });

      const { access_token, user } = response.data;

      if (!access_token) {
        throw new Error('No access token returned from server.');
      }

      // If user object was returned, store it; otherwise build default profile
      const userProfile = user || {
        id: 'user-default-id',
        email: email,
        full_name: 'Admin User',
        role: 'admin',
        organization_id: 'org-default-id'
      };

      setAuth(access_token, userProfile);
      router.replace('/');
    } catch (err: any) {
      console.error('Login error:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else if (Array.isArray(detail)) {
        setErrorMessage(detail[0]?.msg || 'Validation failed');
      } else {
        setErrorMessage('Failed to sign in. Please verify your backend server is running and credentials are correct.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.post('/auth/register', {
        email: email.trim(),
        password: password,
        full_name: fullName.trim(),
        organization_name: orgName.trim(),
        organization_slug: orgSlug.trim() || orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      });

      setSuccessMessage('Organization registered successfully! Signing you in...');

      // Auto-login after successful registration
      const loginRes = await api.post('/auth/login', {
        email: email.trim(),
        password: password
      });

      const { access_token, user } = loginRes.data;
      setAuth(access_token, user);
      router.replace('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else if (Array.isArray(detail)) {
        setErrorMessage(detail[0]?.msg || 'Registration failed');
      } else {
        setErrorMessage('Registration failed. Ensure organization slug is unique and email is not already registered.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 space-y-6 relative z-10 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <PhoneCall className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white gradient-text">R4R AI</h1>
            <p className="text-xs text-slate-400 mt-1">Enterprise Voice Assistant SaaS Platform</p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'login'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            Sign In
          </button>
          {/* <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Organization
          </button> */}
        </div>

        {/* Demo Credentials Quick Pill */}
        {/* {mode === 'login' && (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Demo Admin Account</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">admin@apexrealty.com / password123</div>
            </div>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition-colors"
            >
              Fill Demo
            </button>
          </div>
        )} */}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-2.5 text-emerald-300 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="flex-1">{successMessage}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Work Email</label>
              <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus-within:border-indigo-500">
                <Mail className="w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus-within:border-indigo-500">
                <Lock className="w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full gradient-bg py-3.5 rounded-xl font-semibold text-sm text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 focus-within:border-indigo-500">
                <User className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Company / Organization</label>
              <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 focus-within:border-indigo-500">
                <Building2 className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  placeholder="Acme Real Estate"
                  required
                  className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Organization Slug</label>
              <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 focus-within:border-indigo-500">
                <span className="text-xs text-slate-500 select-none">app/</span>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="acme-real-estate"
                  required
                  className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Work Email</label>
              <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 focus-within:border-indigo-500">
                <Mail className="w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@acme.com"
                  required
                  className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 focus-within:border-indigo-500">
                <Lock className="w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (min 8 chars)"
                  minLength={8}
                  required
                  className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full gradient-bg py-3.5 rounded-xl font-semibold text-sm text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Organization...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Tenant</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
