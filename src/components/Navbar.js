'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Settings, Shield, Home, LogOut, Menu, X,
  User, ChevronDown, Sparkles, HelpCircle, LifeBuoy
} from 'lucide-react';

export default function Navbar() {
  const { user, profile, signOut, loading } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    ...(user ? [
      { href: '/chat', label: 'Chat', icon: MessageSquare },
      { href: '/faq', label: 'FAQ', icon: HelpCircle },
      { href: '/support', label: 'Support', icon: LifeBuoy },
      { href: '/settings', label: 'Settings', icon: Settings },
    ] : [
      { href: '/faq', label: 'FAQ', icon: HelpCircle },
    ]),
    ...(profile?.is_admin || profile?.role === 'owner' ? [
      { href: '/admin', label: 'Admin', icon: Shield },
    ] : []),
  ];

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5">
            <Image src="/toxiqailogo.png" alt="ToxiQ AI" width={32} height={32} className="rounded-lg" />
            <span className="text-base font-bold tracking-tight">ToxiQ AI</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    active
                      ? 'bg-white/[0.06] text-white'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Auth section */}
          <div className="hidden md:flex items-center space-x-2">
            {loading ? (
              <div className="w-7 h-7 rounded-full shimmer" />
            ) : user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-500/80 flex items-center justify-center text-xs font-semibold">
                    {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-[13px] text-zinc-300 max-w-[120px] truncate">{profile?.display_name || 'User'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-1.5 w-52 glass-strong rounded-xl p-1.5 shadow-xl border border-white/[0.06]"
                    >
                      <div className="px-3 py-2 border-b border-white/[0.04] mb-1">
                        <p className="text-sm font-medium">{profile?.display_name}</p>
                        <p className="text-xs text-zinc-500">@{profile?.username}</p>
                      </div>
                      <Link
                        href="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] text-[13px] text-zinc-300 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => { signOut(); setProfileOpen(false); }}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-[13px] text-red-400 w-full transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" className="text-[13px] font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
                  Sign In
                </Link>
                <Link href="/register" className="text-[13px] font-medium bg-indigo-500 hover:bg-indigo-400 text-white px-3.5 py-1.5 rounded-lg transition-colors">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/[0.04] bg-[#09090b]/95 backdrop-blur-lg"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href) ? 'bg-white/[0.06] text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {user ? (
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-red-400 w-full hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <div className="flex space-x-2 pt-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-zinc-400 hover:text-white py-2 px-4 flex-1 text-center rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                    Sign In
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="text-sm font-medium bg-indigo-500 hover:bg-indigo-400 text-white py-2 px-4 flex-1 text-center rounded-lg transition-colors">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
