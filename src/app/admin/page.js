'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Shield, Users, Bot, BarChart3, Settings, Search,
  Plus, Trash2, Edit3, Save, X, Check, ChevronDown,
  MessageSquare, Zap, Clock, Eye, EyeOff, Key,
  UserCheck, UserX, Image, Mic, Sparkles, Activity,
  Database, Globe, Lock, Unlock, RefreshCw, Download,
  TrendingUp, Hash, Ticket, Send, ArrowLeft, RotateCcw,
  CheckCircle2, XCircle, AlertTriangle, Bug, HelpCircle,
  Lightbulb, Filter
} from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'agents', label: 'AI Agents', icon: Bot },
  { id: 'statistics', label: 'Statistics', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminPage() {
  const { user, profile, supabase, loading: authLoading, profileLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) return;
    if (!profile) {
      // Profile failed to load — don't redirect, just stop loading
      setLoading(false);
      return;
    }
    if (!profile.is_admin && profile.role !== 'owner') {
      router.push('/chat');
      return;
    }
    setLoading(false);
  }, [profile, authLoading, profileLoading, user]);

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.is_admin && profile?.role !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">You don't have access to the admin panel.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Admin sidebar - horizontal on mobile, vertical on desktop */}
      <aside className="md:w-56 flex-shrink-0 bg-[#09090b]/95 backdrop-blur-lg border-b md:border-b-0 md:border-r border-white/[0.04] p-2 md:p-3 flex md:flex-col overflow-x-auto md:overflow-x-hidden">
        <div className="hidden md:flex items-center space-x-2 mb-4 px-1">
          <Shield className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Admin Panel</h2>
        </div>

        <nav className="flex md:flex-col md:space-y-0.5 space-x-1 md:space-x-0 flex-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 md:space-x-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/15'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <DashboardTab key="dashboard" supabase={supabase} />}
          {activeTab === 'users' && <UsersTab key="users" supabase={supabase} currentUser={user} currentProfile={profile} />}
          {activeTab === 'tickets' && <TicketsTab key="tickets" supabase={supabase} currentUser={user} />}
          {activeTab === 'agents' && <AgentsTab key="agents" supabase={supabase} />}
          {activeTab === 'statistics' && <StatisticsTab key="statistics" supabase={supabase} />}
          {activeTab === 'settings' && <SettingsTab key="settings" supabase={supabase} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD TAB
// ============================================
function DashboardTab({ supabase }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
    totalAgents: 0,
    activeUsers: 0,
    todayMessages: 0,
    openTickets: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchActivity();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = await Promise.allSettled([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('ai_agents').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    setStats({
      totalUsers: results[0].status === 'fulfilled' ? (results[0].value.count || 0) : 0,
      totalConversations: results[1].status === 'fulfilled' ? (results[1].value.count || 0) : 0,
      totalMessages: results[2].status === 'fulfilled' ? (results[2].value.count || 0) : 0,
      totalAgents: results[3].status === 'fulfilled' ? (results[3].value.count || 0) : 0,
      todayMessages: results[4].status === 'fulfilled' ? (results[4].value.count || 0) : 0,
      openTickets: results[5].status === 'fulfilled' ? (results[5].value.count || 0) : 0,
    });
  };

  const fetchActivity = async () => {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentActivity(data || []);
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-indigo-500/10 text-indigo-400' },
    { label: 'Conversations', value: stats.totalConversations, icon: MessageSquare, color: 'bg-violet-500/10 text-violet-400' },
    { label: 'Total Messages', value: stats.totalMessages, icon: Zap, color: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'AI Agents', value: stats.totalAgents, icon: Bot, color: 'bg-amber-500/10 text-amber-400' },
    { label: 'Today\'s Messages', value: stats.todayMessages, icon: Clock, color: 'bg-cyan-500/10 text-cyan-400' },
    { label: 'Open Tickets', value: stats.openTickets, icon: Ticket, color: 'bg-rose-500/10 text-rose-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <h1 className="text-lg font-semibold mb-4">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4"
            >
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center mb-2.5`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold">{card.value.toLocaleString()}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center space-x-1.5">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span>Recent Activity</span>
        </h3>
        {recentActivity.length === 0 ? (
          <p className="text-zinc-500 text-[13px]">No recent activity</p>
        ) : (
          <div className="space-y-1.5">
            {recentActivity.map(log => (
              <div key={log.id} className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px]">{log.action}</p>
                  <p className="text-[11px] text-zinc-500">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// TICKETS TAB
// ============================================
const ticketCategories = [
  { id: 'question', label: 'General Question', icon: HelpCircle, color: 'text-indigo-400 bg-indigo-500/10' },
  { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-400 bg-red-500/10' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10' },
  { id: 'issue', label: 'Technical Issue', icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/10' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-emerald-400 bg-emerald-500/10' },
];

const ticketStatusConfig = {
  open: { label: 'Open', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  resolved: { label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  closed: { label: 'Closed', icon: XCircle, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
};

function TicketsTab({ supabase, currentUser }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, byCategory: {} });
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    fetchTickets();
    fetchStats();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedTicket) return;
    // Real-time subscription for new messages on selected ticket
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`admin-ticket-${selectedTicket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${selectedTicket.id}`,
      }, (payload) => {
        setTicketMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selectedTicket?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticketMessages]);

  const fetchStats = async () => {
    const results = await Promise.allSettled([
      supabase.from('tickets').select('id', { count: 'exact', head: true }),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).in('status', ['closed', 'resolved']),
      supabase.from('tickets').select('category, status'),
    ]);

    const byCategory = {};
    if (results[3].status === 'fulfilled' && results[3].value.data) {
      results[3].value.data.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = { total: 0, open: 0, closed: 0 };
        byCategory[t.category].total++;
        if (t.status === 'open' || t.status === 'in_progress') byCategory[t.category].open++;
        else byCategory[t.category].closed++;
      });
    }

    setStats({
      total: results[0].status === 'fulfilled' ? (results[0].value.count || 0) : 0,
      open: results[1].status === 'fulfilled' ? (results[1].value.count || 0) : 0,
      closed: results[2].status === 'fulfilled' ? (results[2].value.count || 0) : 0,
      byCategory,
    });
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // First try with join
      const { data, error } = await supabase
        .from('tickets')
        .select('*, profiles(display_name, username)')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback: fetch tickets without join, then fetch profiles separately
        console.error('Tickets join error:', error);
        const { data: ticketsOnly } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (ticketsOnly && ticketsOnly.length > 0) {
          const userIds = [...new Set(ticketsOnly.map(t => t.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, username')
            .in('user_id', userIds);
          const profileMap = {};
          (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
          setTickets(ticketsOnly.map(t => ({ ...t, profiles: profileMap[t.user_id] || null })));
        } else {
          setTickets([]);
        }
      } else {
        setTickets(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setTickets([]);
    }
    setLoading(false);
  };

  const fetchTicketMessages = async (ticketId) => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*, profiles(display_name, username)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        // Fallback without join
        const { data: msgsOnly } = await supabase
          .from('ticket_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });
        setTicketMessages(msgsOnly || []);
      } else {
        setTicketMessages(data || []);
      }
    } catch {
      setTicketMessages([]);
    }
  };

  const openTicketDetail = (ticket) => {
    setSelectedTicket(ticket);
    fetchTicketMessages(ticket.id);
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: currentUser.id,
          message: replyMessage.trim(),
          is_admin: true,
        })
        .select()
        .single();

      if (error) throw error;
      setTicketMessages(prev => {
        if (prev.find(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
      setReplyMessage('');

      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await supabase.from('tickets').update({ status: 'in_progress' }).eq('id', selectedTicket.id);
        setSelectedTicket(prev => ({ ...prev, status: 'in_progress' }));
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: 'in_progress' } : t));
      }
    } catch {
      toast.error('Failed to send reply');
    }
    setSending(false);
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', ticketId);
    if (!error) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (selectedTicket?.id === ticketId) setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      toast.success(`Ticket ${newStatus === 'closed' ? 'closed' : newStatus === 'open' ? 'reopened' : 'updated'}`);
      fetchStats();
    }
  };

  const deleteTicket = async (ticketId) => {
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    if (!error) {
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
        setTicketMessages([]);
      }
      toast.success('Ticket deleted');
      fetchStats();
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'open') return t.status === 'open' || t.status === 'in_progress';
    if (filter === 'closed') return t.status === 'closed' || t.status === 'resolved';
    return true;
  });

  // Ticket detail view
  if (selectedTicket) {
    const cat = ticketCategories.find(c => c.id === selectedTicket.category);
    const CatIcon = cat?.icon || HelpCircle;
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
        <button onClick={() => { setSelectedTicket(null); setTicketMessages([]); }} className="flex items-center space-x-1 text-[13px] text-zinc-400 hover:text-zinc-200 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /><span>Back to tickets</span>
        </button>

        {/* Ticket header */}
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-lg ${cat?.color || 'text-zinc-400 bg-zinc-500/10'} flex items-center justify-center flex-shrink-0`}>
                <CatIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-[11px] text-zinc-500 font-mono">#{selectedTicket.ticket_number || '—'}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${ticketStatusConfig[selectedTicket.status]?.color || ''}`}>
                    {ticketStatusConfig[selectedTicket.status]?.label || selectedTicket.status}
                  </span>
                  <span className={`text-[10px] font-medium capitalize ${selectedTicket.priority === 'urgent' ? 'text-red-400' : selectedTicket.priority === 'high' ? 'text-orange-400' : 'text-zinc-500'}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <h2 className="text-sm font-semibold mb-1">{selectedTicket.subject}</h2>
                <p className="text-[11px] text-zinc-500">
                  by <span className="text-zinc-300">{selectedTicket.profiles?.display_name || 'Unknown'}</span>
                  {' '}(@{selectedTicket.profiles?.username || '?'})
                  {' · '}{new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
              {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
                <button onClick={() => updateTicketStatus(selectedTicket.id, 'closed')} className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-300 text-[11px] font-medium transition-colors">
                  <XCircle className="w-3 h-3" /><span>Close</span>
                </button>
              )}
              {(selectedTicket.status === 'closed' || selectedTicket.status === 'resolved') && (
                <button onClick={() => updateTicketStatus(selectedTicket.id, 'open')} className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-medium transition-colors">
                  <RotateCcw className="w-3 h-3" /><span>Reopen</span>
                </button>
              )}
              <button onClick={() => deleteTicket(selectedTicket.id)} className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-medium transition-colors">
                <Trash2 className="w-3 h-3" /><span>Delete</span>
              </button>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.04]">
            <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-2 mb-4 max-h-[45vh] overflow-y-auto pr-1">
          {ticketMessages.map(msg => (
            <div key={msg.id} className={`p-3.5 rounded-xl ${msg.is_admin ? 'bg-indigo-500/5 border border-indigo-500/10 ml-8' : 'bg-white/[0.03] border border-white/[0.05] mr-8'}`}>
              <div className="flex items-center space-x-1.5 mb-1.5">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${msg.is_admin ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-500/20 text-zinc-300'}`}>
                  {(msg.profiles?.display_name || (msg.is_admin ? 'A' : 'U'))[0]?.toUpperCase()}
                </div>
                <span className={`text-[11px] font-medium ${msg.is_admin ? 'text-indigo-400' : 'text-zinc-300'}`}>
                  {msg.profiles?.display_name || (msg.is_admin ? 'Admin' : 'User')}
                </span>
                {msg.is_admin && <span className="px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[8px] font-bold">STAFF</span>}
                <span className="text-[10px] text-zinc-600">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply box */}
        <div className="flex space-x-2">
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
            placeholder="Write an admin reply..."
            className="input-dark pl-3.5 text-[13px] flex-1 min-h-[60px] resize-y"
          />
          <button
            onClick={sendReply}
            disabled={!replyMessage.trim() || sending}
            className="p-3 self-end rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-30 transition-colors"
          >
            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Tickets</h1>
        <button onClick={() => { fetchTickets(); fetchStats(); }} className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
          <RefreshCw className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2"><Ticket className="w-4 h-4" /></div>
          <p className="text-xl font-bold">{stats.total}</p>
          <p className="text-[11px] text-zinc-500">Total Tickets</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2"><Clock className="w-4 h-4" /></div>
          <p className="text-xl font-bold">{stats.open}</p>
          <p className="text-[11px] text-zinc-500">Open Tickets</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2"><CheckCircle2 className="w-4 h-4" /></div>
          <p className="text-xl font-bold">{stats.closed}</p>
          <p className="text-[11px] text-zinc-500">Closed Tickets</p>
        </div>
      </div>

      {/* Stats per category */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 mb-4">
          <h3 className="text-[13px] font-semibold mb-3">By Category</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {ticketCategories.map(cat => {
              const catStats = stats.byCategory[cat.id];
              if (!catStats) return null;
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="flex items-center space-x-2 p-2.5 rounded-lg bg-white/[0.02]">
                  <div className={`w-7 h-7 rounded-md ${cat.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium">{cat.label}</p>
                    <p className="text-[10px] text-zinc-500">{catStats.total} total · {catStats.open} open · {catStats.closed} closed</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center space-x-1 mb-4">
        <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1" />
        {['open', 'closed', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors capitalize ${
              filter === f ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-zinc-400 border border-white/[0.05] hover:bg-white/[0.04]'
            }`}
          >
            {f} {f === 'open' ? `(${stats.open})` : f === 'closed' ? `(${stats.closed})` : `(${stats.total})`}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center"><div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" /></div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center">
            <Ticket className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-[13px] text-zinc-500">No {filter !== 'all' ? filter : ''} tickets</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] max-h-[50vh] overflow-y-auto">
            {filteredTickets.map(ticket => {
              const cat = ticketCategories.find(c => c.id === ticket.category);
              const CatIcon = cat?.icon || HelpCircle;
              const statusCfg = ticketStatusConfig[ticket.status] || ticketStatusConfig.open;
              return (
                <div key={ticket.id} className="flex items-center p-3 hover:bg-white/[0.02] transition-colors group">
                  <button onClick={() => openTicketDetail(ticket)} className="flex items-center flex-1 min-w-0 text-left space-x-3">
                    <div className={`w-8 h-8 rounded-lg ${cat?.color || 'text-zinc-400 bg-zinc-500/10'} flex items-center justify-center flex-shrink-0`}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-0.5">
                        <span className="text-[10px] text-zinc-600 font-mono">#{ticket.ticket_number || '—'}</span>
                        <p className="text-[13px] font-medium truncate">{ticket.subject}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border flex-shrink-0 ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        {ticket.priority !== 'normal' && (
                          <span className={`text-[9px] font-bold uppercase ${ticket.priority === 'urgent' ? 'text-red-400' : ticket.priority === 'high' ? 'text-orange-400' : 'text-zinc-500'}`}>
                            {ticket.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {ticket.profiles?.display_name || 'Unknown'} · @{ticket.profiles?.username || '?'} · {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                    {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                      <button onClick={() => updateTicketStatus(ticket.id, 'closed')} className="p-1.5 rounded-md hover:bg-zinc-500/10" title="Close">
                        <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    )}
                    {(ticket.status === 'closed' || ticket.status === 'resolved') && (
                      <button onClick={() => updateTicketStatus(ticket.id, 'open')} className="p-1.5 rounded-md hover:bg-amber-500/10" title="Reopen">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    )}
                    <button onClick={() => deleteTicket(ticket.id)} className="p-1.5 rounded-md hover:bg-red-500/10" title="Delete">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// USERS TAB
// ============================================
function UsersTab({ supabase, currentUser, currentProfile }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [agents, setAgents] = useState([]);
  const [userAccess, setUserAccess] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchAgents();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const fetchAgents = async () => {
    const { data } = await supabase.from('ai_agents').select('*').eq('is_active', true);
    setAgents(data || []);
  };

  const fetchUserAccess = async (userId) => {
    const { data } = await supabase
      .from('user_ai_access')
      .select('*, ai_agents(name)')
      .eq('user_id', userId);
    setUserAccess(data || []);
  };

  const toggleAdmin = async (userId, isAdmin) => {
    const newIsAdmin = !isAdmin;
    const newRole = newIsAdmin ? 'admin' : 'user';
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: newIsAdmin, role: newRole })
      .eq('user_id', userId);

    if (!error) {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_admin: newIsAdmin, role: newRole } : u));
      setSelectedUser(prev => prev && prev.user_id === userId ? { ...prev, is_admin: newIsAdmin, role: newRole } : prev);
      toast.success(`Role updated to ${newRole}`);
    }
  };

  const setUserRole = async (userId, role) => {
    const isAdmin = role === 'admin' || role === 'owner';
    const { error } = await supabase
      .from('profiles')
      .update({ role, is_admin: isAdmin })
      .eq('user_id', userId);

    if (!error) {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role, is_admin: isAdmin } : u));
      setSelectedUser(prev => prev && prev.user_id === userId ? { ...prev, role, is_admin: isAdmin } : prev);
      toast.success(`Role updated to ${role}`);
    }
  };

  const grantAccess = async (userId, agentId, prompts = 100) => {
    const { error } = await supabase
      .from('user_ai_access')
      .upsert({
        user_id: userId,
        ai_agent_id: agentId,
        allowed_prompts: prompts,
        is_active: true,
        granted_by: currentUser.id,
      }, { onConflict: 'user_id,ai_agent_id' });

    if (!error) {
      toast.success('Access granted');
      fetchUserAccess(userId);
    }
  };

  const revokeAccess = async (accessId) => {
    const { error } = await supabase
      .from('user_ai_access')
      .delete()
      .eq('id', accessId);

    if (!error) {
      toast.success('Access revoked');
      setUserAccess(prev => prev.filter(a => a.id !== accessId));
    }
  };

  const updatePromptLimit = async (accessId, newLimit) => {
    const { error } = await supabase
      .from('user_ai_access')
      .update({ allowed_prompts: parseInt(newLimit) })
      .eq('id', accessId);

    if (!error) {
      toast.success('Prompt limit updated');
      setUserAccess(prev => prev.map(a => a.id === accessId ? { ...a, allowed_prompts: parseInt(newLimit) } : a));
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">User Management</h1>
        <button onClick={fetchUsers} className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
          <RefreshCw className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 z-10 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username, display name, or email..."
          className="input-dark pl-8 text-[13px]"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Users list */}
        <div className="flex-1">
          <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-white/[0.04]">
              <p className="text-[13px] text-zinc-400">{filteredUsers.length} users found</p>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-[60vh] overflow-y-auto">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 shimmer h-14" />
                ))
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u); fetchUserAccess(u.user_id); }}
                    className={`w-full flex items-center space-x-3 p-3 hover:bg-white/[0.03] transition-colors text-left ${
                      selectedUser?.id === u.id ? 'bg-indigo-500/5' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[13px] font-bold text-indigo-300 flex-shrink-0">
                      {u.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <p className="font-medium text-[13px]">{u.display_name}</p>
                        {u.role === 'owner' && (
                          <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-bold">
                            OWNER
                          </span>
                        )}
                        {u.role === 'admin' && (
                          <span className="px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-bold">
                            ADMIN
                          </span>
                        )}
                        {(!u.role || u.role === 'user') && u.is_admin && (
                          <span className="px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-bold">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">@{u.username}</p>
                    </div>
                    <p className="text-[10px] text-zinc-600">{new Date(u.created_at).toLocaleDateString()}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* User details panel */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="w-80 bg-white/[0.03] border border-white/[0.05] rounded-xl p-5 self-start"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">User Details</h3>
                <button onClick={() => setSelectedUser(null)} className="p-1 rounded-md hover:bg-white/[0.04]">
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>

              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-lg font-bold text-indigo-300 mx-auto mb-2">
                  {selectedUser.display_name?.[0]?.toUpperCase()}
                </div>
                <p className="font-semibold text-sm">{selectedUser.display_name}</p>
                <p className="text-[13px] text-zinc-500">@{selectedUser.username}</p>
              </div>

              {/* Role Management */}
              <div className="mb-3">
                <h4 className="text-[13px] font-semibold mb-2 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Role</span>
                </h4>
                <div className="space-y-1">
                  {['user', 'admin', ...(currentProfile?.role === 'owner' ? ['owner'] : [])].map(role => {
                    const isCurrentRole = (selectedUser.role || 'user') === role;
                    const roleColors = {
                      user: 'border-zinc-500/20 text-zinc-400',
                      admin: 'border-indigo-500/20 text-indigo-400',
                      owner: 'border-amber-500/20 text-amber-400',
                    };
                    const activeBg = {
                      user: 'bg-zinc-500/10 border-zinc-500/30',
                      admin: 'bg-indigo-500/10 border-indigo-500/30',
                      owner: 'bg-amber-500/10 border-amber-500/30',
                    };
                    return (
                      <button
                        key={role}
                        onClick={() => setUserRole(selectedUser.user_id, role)}
                        disabled={role === 'owner' && currentProfile?.role !== 'owner'}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors text-[13px] font-medium ${
                          isCurrentRole ? activeBg[role] : `bg-white/[0.02] ${roleColors[role]} hover:bg-white/[0.04]`
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        <span className="capitalize">{role}</span>
                        {isCurrentRole && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Access Management */}
              <div className="mb-3">
                <h4 className="text-[13px] font-semibold mb-2 flex items-center space-x-1.5">
                  <Bot className="w-3.5 h-3.5 text-violet-400" />
                  <span>AI Access</span>
                </h4>

                {/* Current access */}
                <div className="space-y-1.5 mb-2">
                  {userAccess.map(access => (
                    <div key={access.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium">{access.ai_agents?.name}</p>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <input
                            type="number"
                            defaultValue={access.allowed_prompts}
                            onBlur={(e) => updatePromptLimit(access.id, e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[11px] text-center"
                            min="-1"
                            title="-1 = unlimited"
                          />
                          <span className="text-[10px] text-zinc-500">
                            {access.allowed_prompts === -1 ? '∞' : 'prompts'} ({access.used_prompts} used)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => revokeAccess(access.id)}
                        className="p-1 rounded-md hover:bg-red-500/10 text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Grant new access */}
                <div className="space-y-1">
                  {agents
                    .filter(a => !userAccess.find(ua => ua.ai_agent_id === a.id))
                    .map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => grantAccess(selectedUser.user_id, agent.id)}
                        className="w-full flex items-center space-x-1.5 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-colors text-[13px]"
                      >
                        <Plus className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">{agent.name}</span>
                      </button>
                    ))
                  }
                </div>
              </div>

              <div className="text-[10px] text-zinc-600 mt-3">
                <p>Joined: {new Date(selectedUser.created_at).toLocaleString()}</p>
                <p>User ID: {selectedUser.user_id}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================
// AGENTS TAB
// ============================================
function AgentsTab({ supabase }) {
  const [agents, setAgents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', api_type: 'openai', model: '',
    api_key_env: 'OPENAI_API_KEY', system_prompt: 'You are a helpful AI assistant.',
    max_tokens: 4096, temperature: 0.7, supports_images: false,
    supports_voice: false, supports_image_generation: false, image_url: '',
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    const { data } = await supabase.from('ai_agents').select('*').order('created_at');
    setAgents(data || []);
  };

  const saveAgent = async () => {
    if (!form.name || !form.model) {
      toast.error('Name and model are required');
      return;
    }

    if (editing) {
      const { error } = await supabase.from('ai_agents').update(form).eq('id', editing);
      if (!error) { toast.success('Agent updated'); setEditing(null); }
    } else {
      const { error } = await supabase.from('ai_agents').insert(form);
      if (!error) { toast.success('Agent created'); setShowNew(false); }
    }

    setForm({
      name: '', description: '', api_type: 'openai', model: '',
      api_key_env: 'OPENAI_API_KEY', system_prompt: 'You are a helpful AI assistant.',
      max_tokens: 4096, temperature: 0.7, supports_images: false,
      supports_voice: false, supports_image_generation: false, image_url: '',
    });
    fetchAgents();
  };

  const deleteAgent = async (id) => {
    const { error } = await supabase.from('ai_agents').delete().eq('id', id);
    if (!error) {
      toast.success('Agent deleted');
      fetchAgents();
    }
  };

  const startEdit = (agent) => {
    setEditing(agent.id);
    setForm({
      name: agent.name,
      description: agent.description,
      api_type: agent.api_type,
      model: agent.model,
      api_key_env: agent.api_key_env,
      system_prompt: agent.system_prompt,
      max_tokens: agent.max_tokens,
      temperature: agent.temperature,
      supports_images: agent.supports_images,
      supports_voice: agent.supports_voice,
      supports_image_generation: agent.supports_image_generation,
      image_url: agent.image_url,
    });
    setShowNew(true);
  };

  const toggleActive = async (id, isActive) => {
    await supabase.from('ai_agents').update({ is_active: !isActive }).eq('id', id);
    fetchAgents();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">AI Agents</h1>
        <button
          onClick={() => { setShowNew(!showNew); setEditing(null); setForm({
            name: '', description: '', api_type: 'openai', model: '',
            api_key_env: 'OPENAI_API_KEY', system_prompt: 'You are a helpful AI assistant.',
            max_tokens: 4096, temperature: 0.7, supports_images: false,
            supports_voice: false, supports_image_generation: false, image_url: '',
          }); }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[13px] font-medium hover:border-indigo-500/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Agent</span>
        </button>
      </div>

      {/* Agent Form */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5 mb-4 overflow-hidden"
          >
            <h3 className="text-sm font-semibold mb-3">{editing ? 'Edit Agent' : 'New Agent'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-dark pl-3.5 text-sm" placeholder="ChatGPT-4o" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Model ID</label>
                <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="input-dark pl-3.5 text-sm" placeholder="gpt-4o" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">API Type</label>
                <select value={form.api_type} onChange={e => setForm({...form, api_type: e.target.value})} className="input-dark pl-3.5 text-sm">
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">API Key Env Variable</label>
                <input value={form.api_key_env} onChange={e => setForm({...form, api_key_env: e.target.value})} className="input-dark pl-3.5 text-sm" placeholder="OPENAI_API_KEY" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Tokens</label>
                <input type="number" value={form.max_tokens} onChange={e => setForm({...form, max_tokens: parseInt(e.target.value)})} className="input-dark pl-3.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Temperature</label>
                <input type="number" step="0.1" min="0" max="2" value={form.temperature} onChange={e => setForm({...form, temperature: parseFloat(e.target.value)})} className="input-dark pl-3.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Image URL</label>
                <input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} className="input-dark pl-3.5 text-sm" placeholder="/agents/chatgpt.svg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-dark pl-3.5 text-sm" placeholder="Description..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">System Prompt</label>
                <textarea value={form.system_prompt} onChange={e => setForm({...form, system_prompt: e.target.value})} className="input-dark pl-3.5 text-sm min-h-[80px] resize-y" />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={form.supports_images} onChange={e => setForm({...form, supports_images: e.target.checked})} className="rounded" />
                  <span className="text-sm">Supports Images</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={form.supports_voice} onChange={e => setForm({...form, supports_voice: e.target.checked})} className="rounded" />
                  <span className="text-sm">Supports Voice</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={form.supports_image_generation} onChange={e => setForm({...form, supports_image_generation: e.target.checked})} className="rounded" />
                  <span className="text-sm">Image Generation</span>
                </label>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <button onClick={saveAgent} className="text-[13px] font-medium bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg transition-colors">
                {editing ? 'Update' : 'Create'} Agent
              </button>
              <button onClick={() => { setShowNew(false); setEditing(null); }} className="text-[13px] font-medium px-4 py-2 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agents grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map(agent => (
          <div
            key={agent.id}
            className={`bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 ${!agent.is_active ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between mb-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-center space-x-0.5">
                <button onClick={() => toggleActive(agent.id, agent.is_active)} className="p-1 rounded-md hover:bg-white/[0.04]">
                  {agent.is_active ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
                </button>
                <button onClick={() => startEdit(agent)} className="p-1 rounded-md hover:bg-white/[0.04]">
                  <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                </button>
                <button onClick={() => deleteAgent(agent.id)} className="p-1 rounded-md hover:bg-red-500/10">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <h3 className="text-[13px] font-semibold mb-0.5">{agent.name}</h3>
            <p className="text-[11px] text-zinc-500 mb-2 line-clamp-2">{agent.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 text-[10px]">{agent.api_type}</span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px]">{agent.model}</span>
              {agent.supports_images && <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">Images</span>}
              {agent.supports_voice && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">Voice</span>}
              {agent.supports_image_generation && <span className="px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 text-[10px]">Gen Images</span>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// STATISTICS TAB
// ============================================
function StatisticsTab({ supabase }) {
  const [stats, setStats] = useState({
    messagesByDay: [],
    topUsers: [],
    topAgents: [],
    totalTokens: 0,
    avgMessagesPerConv: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Top users by message count
    const { data: convData } = await supabase
      .from('conversations')
      .select('user_id, message_count, profiles!conversations_user_id_fkey(display_name, username)');

    const userMessages = {};
    convData?.forEach(c => {
      const uid = c.user_id;
      if (!userMessages[uid]) {
        userMessages[uid] = {
          name: c.profiles?.display_name || 'Unknown',
          username: c.profiles?.username || '',
          total: 0,
          convs: 0,
        };
      }
      userMessages[uid].total += c.message_count || 0;
      userMessages[uid].convs += 1;
    });

    const topUsers = Object.values(userMessages)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Top agents by usage
    const { data: accessData } = await supabase
      .from('user_ai_access')
      .select('used_prompts, ai_agents(name)');

    const agentUsage = {};
    accessData?.forEach(a => {
      const name = a.ai_agents?.name || 'Unknown';
      agentUsage[name] = (agentUsage[name] || 0) + (a.used_prompts || 0);
    });

    const topAgents = Object.entries(agentUsage)
      .map(([name, usage]) => ({ name, usage }))
      .sort((a, b) => b.usage - a.usage);

    // Total conversation stats
    const totalMsgs = topUsers.reduce((acc, u) => acc + u.total, 0);
    const totalConvs = topUsers.reduce((acc, u) => acc + u.convs, 0);

    setStats({
      topUsers,
      topAgents,
      avgMessagesPerConv: totalConvs > 0 ? Math.round(totalMsgs / totalConvs) : 0,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <h1 className="text-lg font-semibold mb-4">Statistics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Users */}
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Top Users by Messages</span>
          </h3>
          <div className="space-y-2">
            {stats.topUsers.map((user, i) => (
              <div key={i} className="flex items-center space-x-2.5">
                <span className="text-[11px] text-zinc-500 w-5">#{i + 1}</span>
                <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center text-[11px] font-bold text-indigo-300">
                  {user.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium">{user.name}</p>
                  <p className="text-[10px] text-zinc-500">@{user.username} · {user.convs} chats</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-indigo-400">{user.total.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-500">messages</p>
                </div>
              </div>
            ))}
            {stats.topUsers.length === 0 && (
              <p className="text-[13px] text-zinc-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Top Agents */}
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center space-x-1.5">
            <Bot className="w-4 h-4 text-violet-400" />
            <span>AI Agent Usage</span>
          </h3>
          <div className="space-y-2.5">
            {stats.topAgents.map((agent, i) => (
              <div key={i} className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium">{agent.name}</p>
                  <div className="w-full bg-white/[0.04] rounded-full h-1 mt-1">
                    <div
                      className="bg-indigo-500 h-1 rounded-full"
                      style={{ width: `${Math.min(100, (agent.usage / (stats.topAgents[0]?.usage || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-[13px] font-semibold text-violet-400">{agent.usage.toLocaleString()}</span>
              </div>
            ))}
            {stats.topAgents.length === 0 && (
              <p className="text-[13px] text-zinc-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3 flex items-center space-x-1.5">
            <Hash className="w-4 h-4 text-emerald-400" />
            <span>Quick Stats</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-xl font-bold text-indigo-400">{stats.avgMessagesPerConv}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Avg msgs/chat</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-xl font-bold text-indigo-400">{stats.topUsers.length}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Active users</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-xl font-bold text-indigo-400">{stats.topAgents.length}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Agents in use</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-xl font-bold text-indigo-400">
                {stats.topAgents.reduce((acc, a) => acc + a.usage, 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Total prompts used</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// SETTINGS TAB
// ============================================
function SettingsTab({ supabase }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_settings').select('*').order('key');
    setSettings(data || []);
    setLoading(false);
  };

  const updateSetting = async (id, key, value) => {
    const { error } = await supabase
      .from('admin_settings')
      .update({ value: JSON.stringify(value), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      toast.success(`${key} updated`);
      fetchSettings();
    }
  };

  const getSettingValue = (setting) => {
    try {
      return JSON.parse(setting.value);
    } catch {
      return setting.value;
    }
  };

  const isBoolean = (val) => val === 'true' || val === 'false' || val === true || val === false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <h1 className="text-lg font-semibold mb-4">Admin Settings</h1>

      <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {settings.map(setting => {
              const value = getSettingValue(setting);
              const isBool = isBoolean(value);

              return (
                <div key={setting.id} className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      <p className="font-medium text-[13px]">{setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 ml-5">{setting.description}</p>
                  </div>
                  <div>
                    {isBool ? (
                      <button
                        onClick={() => updateSetting(setting.id, setting.key, value === 'true' || value === true ? 'false' : 'true')}
                        className={`w-10 h-5 rounded-full transition-colors ${
                          (value === 'true' || value === true) ? 'bg-indigo-500' : 'bg-zinc-700'
                        } relative`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                          (value === 'true' || value === true) ? 'left-[22px]' : 'left-0.5'
                        }`} />
                      </button>
                    ) : (
                      <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        defaultValue={value}
                        onBlur={(e) => updateSetting(setting.id, setting.key, e.target.value)}
                        className="input-dark pl-3.5 text-[13px] w-36 text-right py-1"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
