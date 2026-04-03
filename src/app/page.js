'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import {
  Sparkles, MessageSquare, Image as ImageIcon, Mic, Shield, Zap, Brain,
  ArrowRight, Star, Users, Globe, Lock, ChevronRight
} from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

export default function HomePage() {
  const { user, profile, supabase } = useAuth();
  const [stats, setStats] = useState({ users: 0, chats: 0, messages: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [profilesRes, convsRes, msgsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('conversations').select('id', { count: 'exact', head: true }),
          supabase.from('messages').select('id', { count: 'exact', head: true }),
        ]);
        setStats({
          users: profilesRes.count || 0,
          chats: convsRes.count || 0,
          messages: msgsRes.count || 0,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    if (supabase) fetchStats();
  }, [supabase]);

  const features = [
    {
      icon: Brain,
      title: 'Multiple AI Models',
      description: 'Access ChatGPT, Gemini, Qwen and more — all from a single interface.',
      color: 'bg-indigo-500/10 text-indigo-400',
    },
    {
      icon: MessageSquare,
      title: 'Intelligent Chat',
      description: 'Real-time conversations with context awareness and conversation history.',
      color: 'bg-violet-500/10 text-violet-400',
    },
    {
      icon: ImageIcon,
      title: 'Image Generation',
      description: 'Create visuals with FLUX, DALL-E and other generation models.',
      color: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      icon: Mic,
      title: 'Voice Messages',
      description: 'Record voice messages with automatic transcription and processing.',
      color: 'bg-amber-500/10 text-amber-400',
    },
    {
      icon: Shield,
      title: 'Admin Control',
      description: 'Full admin panel with user management, access control and analytics.',
      color: 'bg-sky-500/10 text-sky-400',
    },
    {
      icon: Lock,
      title: 'Secure Access',
      description: 'Per-user AI access control with prompt limits and permissions.',
      color: 'bg-rose-500/10 text-rose-400',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-[13px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-zinc-400">AI platform for everyone</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-bold mb-5 leading-[1.1] tracking-tight"
          >
            Your AI assistant,{' '}
            <span className="gradient-text">reimagined</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto mb-8 leading-relaxed"
          >
            Chat with multiple AI models, generate images, and send voice messages — all in one clean interface.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href={user ? '/chat' : '/register'}
              className="group flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-sm transition-colors"
            >
              <span>{user ? 'Start Chatting' : 'Get Started Free'}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#features"
              className="px-6 py-2.5 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04] text-sm font-medium transition-colors"
            >
              Learn More
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-sm mx-auto"
          >
            {[
              { label: 'Users', value: stats.users, icon: Users },
              { label: 'Conversations', value: stats.chats, icon: MessageSquare },
              { label: 'Messages', value: stats.messages, icon: Zap },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-3 text-center">
                <stat.icon className="w-4 h-4 text-indigo-400 mx-auto mb-1.5" />
                <div className="text-lg font-semibold">{stat.value.toLocaleString()}</div>
                <div className="text-[11px] text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.p variants={fadeIn} className="text-[13px] font-medium text-indigo-400 mb-3 tracking-wide uppercase">
              Features
            </motion.p>
            <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
              Everything you need
            </motion.h2>
            <motion.p variants={fadeIn} className="text-zinc-400 max-w-md mx-auto text-sm">
              Built for simplicity and power. Every feature designed to help you get more done with AI.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeIn}
                  className="glass-card p-6 group"
                >
                  <div className={`w-10 h-10 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-1.5">{feature.title}</h3>
                  <p className="text-[13px] text-zinc-400 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="glass-card p-10 sm:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] to-violet-500/[0.03]" />
            <div className="relative">
              <Globe className="w-10 h-10 text-indigo-400 mx-auto mb-5 animate-spin-slow" />
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
                Ready to get started?
              </h2>
              <p className="text-zinc-400 max-w-md mx-auto mb-6 text-sm">
                Join the platform and access the most powerful AI models in a clean, fast interface.
              </p>
              <Link
                href={user ? '/chat' : '/register'}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-sm transition-colors"
              >
                <span>{user ? 'Open Chat' : 'Create Account'}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Image src="/toxiqailogo.png" alt="ToxiQ AI" width={24} height={24} className="rounded-md" />
            <span className="text-sm font-semibold">ToxiQ AI</span>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} ToxiQ AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
