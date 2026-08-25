'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  RotateCw, 
  Search, 
  PlusCircle, 
  Inbox, 
  ArrowLeftRight, 
  Shield, 
  LogOut, 
  User as UserIcon, 
  ChevronDown,
  Building,
  Menu,
  X,
  LayoutDashboard
} from 'lucide-react';
import clsx from 'clsx';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/session');
      const data = await res.json();
      setSessionUser(data.user);
    } catch (err) {
      setSessionUser(null);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [pathname]);

  const handleDemoSwitch = async (email: string) => {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setIsDemoMenuOpen(false);
        await fetchSession();
        router.refresh();
      }
    } catch (err) {
      console.error('Account switch failed', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSessionUser(null);
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Discover Supplies', href: '/supplies', icon: Search },
    { name: 'Requests', href: '/requests', icon: Inbox },
    { name: 'Transfers', href: '/transfers', icon: ArrowLeftRight },
  ];

  if (sessionUser?.role === 'ADMIN') {
    navLinks.push({ name: 'Admin & Audit', href: '/admin', icon: Shield });
  }

  const demoAccounts = [
    { name: 'Ankit Uttarakar', role: 'ADMIN', dept: 'Campus Admin', email: 'ankit.uttarakar@gmail.com' },
    { name: 'Ankit Verma', role: 'DEPARTMENT_STAFF', dept: 'CSE (Faculty/Staff)', email: 'ankitverma291206@gmail.com' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Institutional Top Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-200">Inter-Departmental Resource Exchange</span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline italic">“Use what already exists before buying what doesn’t.”</span>
        </div>

        {/* Quick Account Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition-colors"
          >
            <span>Switch Account</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isDemoMenuOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-slate-900">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Switch Department Account
              </div>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleDemoSwitch(acc.email)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{acc.name}</div>
                    <div className="text-[11px] text-slate-500">{acc.dept} • {acc.role === 'ADMIN' ? 'Admin' : 'Staff'}</div>
                  </div>
                  {sessionUser?.email === acc.email && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs font-bold text-lg">
                <RotateCw className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight block">
                  Campus Supply Rescue
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase block -mt-1">
                  Surplus Resource Exchange
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )}
                  >
                    <Icon className={clsx('w-4 h-4', isActive ? 'text-emerald-700' : 'text-slate-500')} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Area */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/supplies/new"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>List Surplus Supply</span>
            </Link>

            {sessionUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-900">{sessionUser.full_name}</div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                    <Building className="w-3 h-3 text-slate-400" />
                    <span>{sessionUser.department_code || sessionUser.department_name}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span>Log In</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  'flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold',
                  isActive ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{link.name}</span>
                </div>
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/supplies/new"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex-1 text-center py-2 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold mr-2"
            >
              + List Surplus Supply
            </Link>
            {sessionUser ? (
              <button
                onClick={handleLogout}
                className="py-2 px-3 rounded-lg border border-slate-200 text-rose-600 text-xs font-semibold"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
