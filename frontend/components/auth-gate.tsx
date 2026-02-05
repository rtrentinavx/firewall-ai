'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'authBasic';

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setIsAuthed(true);
    }
    setIsReady(true);
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const token = btoa(`${username}:${password}`);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${token}`
        }
      });

      if (!response.ok) {
        setError('Invalid credentials. Please check your username and password.');
        setIsLoading(false);
        return;
      }

      localStorage.setItem(STORAGE_KEY, token);
      window.dispatchEvent(new Event('auth-changed'));
      setIsAuthed(true);
    } catch (err) {
      setError('Unable to reach the server. Please check your connection.');
      setIsLoading(false);
    }
  };

  if (!isReady) return null;

  if (!isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left Side - Branding */}
            <div className="flex flex-col justify-center space-y-8 lg:pr-8">
              <div className="space-y-6">
                <h2 className="text-4xl font-bold leading-tight text-slate-900 dark:text-white lg:text-5xl">
                  Make every firewall decision faster, safer, and provably compliant.
                </h2>
                <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                  Firewall AI turns complex rule sets into clear action plans. Audit risk, resolve conflicts, and ship
                  changes with confidence across multi-cloud environments.
                </p>
              </div>

              {/* Feature highlights */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white/50 p-4 dark:border-slate-800/70 dark:bg-slate-900/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">AI-Powered Analysis</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Intelligent rule auditing</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white/50 p-4 dark:border-slate-800/70 dark:bg-slate-900/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Multi-Cloud Support</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">AWS, GCP, Azure, Aviatrix</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white/90 p-8 shadow-xl backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/90">
                <div className="mb-8 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500">
                      <Lock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Sign in to access your Firewall AI workspace
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 bg-white dark:bg-slate-800"
                      placeholder="Enter your username"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-white dark:bg-slate-800"
                      placeholder="Enter your password"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 h-11 font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="mr-2">Signing in...</span>
                        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>

                  <div className="pt-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Default credentials: admin / admin
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
