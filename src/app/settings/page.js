'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User, Lock, Palette, LogOut, Save, Eye, EyeOff,
  Mail, AtSign, Shield, MessageSquare, Bot, Zap, Trash2
} from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, signOut, supabase, fetchProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ conversations: 0, messages: 0, agents: 0 });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [convs, msgs, access] = await Promise.all([
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('messages').select('id', { count: 'exact', head: true })
          .in('conversation_id',
            (await supabase.from('conversations').select('id').eq('user_id', user.id)).data?.map(c => c.id) || []
          ),
        supabase.from('user_ai_access').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
      ]);
      setStats({
        conversations: convs.count || 0,
        messages: msgs.count || 0,
        agents: access.count || 0,
      });
    };
    fetchStats();
  }, [user]);

  const updateProfile = async () => {
    setSaving(true);

    // Check username uniqueness
    if (username !== profile?.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('user_id', user.id)
        .single();

      if (existing) {
        toast.error('Username is already taken');
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        username: username.toLowerCase(),
        bio,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
      fetchProfile(user.id);
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password changed!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  const deleteAllChats = async () => {
    if (!confirm('Are you sure you want to delete ALL your chats? This cannot be undone.')) return;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      toast.success('All chats deleted');
      setStats(prev => ({ ...prev, conversations: 0, messages: 0 }));
    }
  };

  const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'account', label: 'Account', icon: Shield },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-lg font-semibold mb-1">Settings</h1>
        <p className="text-[13px] text-zinc-400 mb-5">Manage your account and preferences</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Conversations', value: stats.conversations, icon: MessageSquare, color: 'bg-indigo-500/10 text-indigo-400' },
            { label: 'Messages', value: stats.messages, icon: Zap, color: 'bg-violet-500/10 text-violet-400' },
            { label: 'AI Models', value: stats.agents, icon: Bot, color: 'bg-emerald-500/10 text-emerald-400' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5"
              >
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-[11px] text-zinc-500">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4">
          {/* Tabs */}
          <div className="w-40 flex-shrink-0 space-y-0.5">
            {settingsTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/15'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <div className="pt-3 border-t border-white/[0.04] mt-3">
              <button
                onClick={signOut}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold mb-4">Profile Settings</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="input-dark pl-9 text-[13px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">Username</label>
                    <div className="relative">
                      <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                        className="input-dark pl-9 text-[13px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="input-dark min-h-[70px] resize-y text-[13px]"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="input-dark pl-9 text-[13px] opacity-50 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <button
                    onClick={updateProfile}
                    disabled={saving}
                    className="flex items-center space-x-1.5 text-[13px] font-medium bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold mb-4">Change Password</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-dark pl-9 pr-9 text-[13px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-dark pl-9 text-[13px]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={changePassword}
                    disabled={saving || !newPassword}
                    className="flex items-center space-x-1.5 text-[13px] font-medium bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Change Password</span>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'account' && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5">
                  <h2 className="text-sm font-semibold mb-3">Account Info</h2>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                      <span className="text-[13px] text-zinc-400">Email</span>
                      <span className="text-[13px]">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                      <span className="text-[13px] text-zinc-400">Username</span>
                      <span className="text-[13px]">@{profile?.username}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                      <span className="text-[13px] text-zinc-400">Role</span>
                      <span className={`text-[13px] ${profile?.is_admin ? 'text-indigo-400' : 'text-zinc-300'}`}>
                        {profile?.is_admin ? 'Admin' : 'User'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                      <span className="text-[13px] text-zinc-400">Member Since</span>
                      <span className="text-[13px]">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-red-500/10 rounded-xl p-5">
                  <h2 className="text-sm font-semibold mb-3 text-red-400">Danger Zone</h2>
                  <div className="space-y-1.5">
                    <button
                      onClick={deleteAllChats}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 transition-colors"
                    >
                      <div className="flex items-center space-x-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-[13px] text-red-300">Delete All Conversations</span>
                      </div>
                      <span className="text-[10px] text-red-500">Irreversible</span>
                    </button>

                    <button
                      onClick={signOut}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 transition-colors"
                    >
                      <div className="flex items-center space-x-1.5">
                        <LogOut className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-[13px] text-red-300">Sign Out</span>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
