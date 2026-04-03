'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  MessageSquare, Bug, HelpCircle, Lightbulb, AlertTriangle,
  Send, CheckCircle2, Clock, XCircle, Plus, ArrowLeft
} from 'lucide-react';

const categories = [
  { id: 'question', label: 'General Question', icon: HelpCircle, color: 'text-indigo-400 bg-indigo-500/10' },
  { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-400 bg-red-500/10' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10' },
  { id: 'issue', label: 'Technical Issue', icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/10' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-emerald-400 bg-emerald-500/10' },
];

const statusConfig = {
  open: { label: 'Open', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  resolved: { label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  closed: { label: 'Closed', icon: XCircle, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
};

export default function SupportPage() {
  const { user, profile, supabase, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicket, setNewTicket] = useState({ category: 'question', subject: '', message: '', priority: 'normal' });
  const [submitting, setSubmitting] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [ticketMessages, setTicketMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    if (user) fetchTickets();
    else setLoading(false);
  }, [user, authLoading]);

  useEffect(() => {
    if (!selectedTicket || !supabase) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`user-ticket-${selectedTicket.id}`)
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
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [selectedTicket?.id, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticketMessages]);

  useEffect(() => {
    return () => { if (channelRef.current) supabase?.removeChannel(channelRef.current); };
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) {
        console.error('Tickets fetch error:', error);
        setTickets([]);
      } else {
        const sorted = (data || []).sort((a, b) => {
          const aOpen = a.status === 'open' || a.status === 'in_progress' ? 0 : 1;
          const bOpen = b.status === 'open' || b.status === 'in_progress' ? 0 : 1;
          if (aOpen !== bOpen) return aOpen - bOpen;
          return new Date(b.updated_at) - new Date(a.updated_at);
        });
        setTickets(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setTickets([]);
    }
    setLoading(false);
  };

  const fetchTicketMessages = async (ticketId) => {
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setTicketMessages(data || []);
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          user_id: user.id,
          category: newTicket.category,
          subject: newTicket.subject.trim(),
          message: newTicket.message.trim(),
          priority: newTicket.priority,
          status: 'open',
        })
        .select()
        .single();
      if (error) {
        toast.error('Failed to create ticket: ' + error.message);
        setSubmitting(false);
        return;
      }
      await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        message: newTicket.message.trim(),
        is_admin: false,
      });
      setTickets(prev => [ticket, ...prev]);
      setNewTicket({ category: 'question', subject: '', message: '', priority: 'normal' });
      setShowNew(false);
      toast.success('Ticket #' + (ticket.ticket_number || '') + ' created');
    } catch (err) {
      toast.error('Failed to create ticket');
    }
    setSubmitting(false);
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: replyMessage.trim(),
          is_admin: false,
        })
        .select()
        .single();
      if (error) throw error;
      setTicketMessages(prev => {
        if (prev.find(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
      setReplyMessage('');
    } catch {
      toast.error('Failed to send reply');
    }
  };

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    fetchTicketMessages(ticket.id);
  };

  if (!user && !authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-7 h-7 text-indigo-400" />
        </div>
        <h1 className="text-xl font-bold mb-2">Contact Support</h1>
        <p className="text-sm text-zinc-400 mb-5">Please sign in to create a support ticket.</p>
        <a href="/login" className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[13px] font-medium transition-colors">Sign In</a>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold">Support</h1>
            <p className="text-[13px] text-zinc-400">Get help or report an issue</p>
          </div>
          {!showNew && !selectedTicket && (
            <button onClick={() => setShowNew(true)} className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[13px] font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/20">
              <Plus className="w-3.5 h-3.5" /><span>New Ticket</span>
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {showNew && (
            <motion.div key="new" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Create New Ticket</h2>
                <button onClick={() => setShowNew(false)} className="text-[13px] text-zinc-400 hover:text-zinc-200">Cancel</button>
              </div>
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-zinc-300 mb-2">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {categories.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button key={cat.id} onClick={() => setNewTicket(prev => ({ ...prev, category: cat.id }))} className={`flex flex-col items-center p-3 rounded-xl border transition-all ${newTicket.category === cat.id ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'}`}>
                        <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center mb-1.5`}><Icon className="w-4 h-4" /></div>
                        <span className="text-[11px] font-medium">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">Priority</label>
                <div className="flex space-x-2">
                  {['low', 'normal', 'high', 'urgent'].map(p => (
                    <button key={p} onClick={() => setNewTicket(prev => ({ ...prev, priority: p }))} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors capitalize ${newTicket.priority === p ? (p === 'urgent' ? 'bg-red-500/15 text-red-300 border border-red-500/20' : p === 'high' ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20' : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20') : 'text-zinc-400 border border-white/[0.05] hover:bg-white/[0.04]'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">Subject</label>
                <input type="text" value={newTicket.subject} onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))} placeholder="Brief description of your issue..." className="input-dark pl-3.5 text-[13px]" maxLength={200} />
              </div>
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-zinc-300 mb-1.5">Message</label>
                <textarea value={newTicket.message} onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))} placeholder="Describe your issue in detail..." className="input-dark pl-3.5 text-[13px] min-h-[120px] resize-y" maxLength={2000} />
              </div>
              <button onClick={createTicket} disabled={submitting} className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[13px] font-medium transition-all disabled:opacity-50">
                {submitting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Submit Ticket</span>
              </button>
            </motion.div>
          )}

          {selectedTicket && !showNew && (
            <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <button onClick={() => { setSelectedTicket(null); setTicketMessages([]); }} className="flex items-center space-x-1 text-[13px] text-zinc-400 hover:text-zinc-200 mb-4">
                <ArrowLeft className="w-3.5 h-3.5" /><span>Back to tickets</span>
              </button>
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[11px] text-zinc-500 font-mono">#{selectedTicket.ticket_number || ''}</span>
                      <h2 className="text-sm font-semibold">{selectedTicket.subject}</h2>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${statusConfig[selectedTicket.status]?.color || 'text-zinc-400 bg-zinc-500/10'}`}>
                        {statusConfig[selectedTicket.status]?.label || selectedTicket.status}
                      </span>
                      <span className="text-[11px] text-zinc-500 capitalize">{selectedTicket.category}</span>
                      <span className="text-[11px] text-zinc-600">{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.04]">
                  <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto pr-1">
                {ticketMessages.map(msg => (
                  <div key={msg.id} className={`p-3.5 rounded-xl ${msg.is_admin ? 'bg-indigo-500/5 border border-indigo-500/10 ml-6' : 'bg-white/[0.03] border border-white/[0.05] mr-6'}`}>
                    <div className="flex items-center space-x-1.5 mb-1.5">
                      <span className={`text-[11px] font-medium ${msg.is_admin ? 'text-indigo-400' : 'text-zinc-300'}`}>
                        {msg.is_admin ? 'Support Team' : 'You'}
                      </span>
                      {msg.is_admin && <span className="px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[8px] font-bold">STAFF</span>}
                      <span className="text-[10px] text-zinc-600">{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') ? (
                <div className="flex space-x-2">
                  <textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }} placeholder="Write a reply..." className="input-dark pl-3.5 text-[13px] flex-1 min-h-[60px] resize-y" />
                  <button onClick={sendReply} disabled={!replyMessage.trim()} className="p-2 self-end rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-30 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                  <p className="text-[12px] text-zinc-500">This ticket is closed.</p>
                </div>
              )}
            </motion.div>
          )}

          {!showNew && !selectedTicket && (
            <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl shimmer" />)}</div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4"><MessageSquare className="w-7 h-7 text-indigo-400" /></div>
                  <h2 className="text-sm font-semibold mb-1">No tickets yet</h2>
                  <p className="text-[13px] text-zinc-400 mb-4">Create a ticket to get help from our team</p>
                  <button onClick={() => setShowNew(true)} className="text-[13px] font-medium bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg transition-colors">Create Ticket</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map(ticket => {
                    const catConfig = categories.find(c => c.id === ticket.category);
                    const CatIcon = catConfig?.icon || HelpCircle;
                    const status = statusConfig[ticket.status] || statusConfig.open;
                    const isOpen = ticket.status === 'open' || ticket.status === 'in_progress';
                    return (
                      <button key={ticket.id} onClick={() => openTicket(ticket)} className={`w-full text-left border rounded-xl p-4 hover:border-white/[0.08] transition-all ${isOpen ? 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.04]' : 'bg-white/[0.015] border-white/[0.03] opacity-70 hover:opacity-90'}`}>
                        <div className="flex items-start space-x-3">
                          <div className={`w-9 h-9 rounded-lg ${catConfig?.color || 'text-zinc-400 bg-zinc-500/10'} flex items-center justify-center flex-shrink-0`}><CatIcon className="w-4 h-4" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-0.5">
                              <span className="text-[10px] text-zinc-600 font-mono">#{ticket.ticket_number || ''}</span>
                              <p className="text-[13px] font-medium truncate">{ticket.subject}</p>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border flex-shrink-0 ${status.color}`}>{status.label}</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate">{ticket.message}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-[10px] text-zinc-600 capitalize">{ticket.category}</span>
                              <span className="text-[10px] text-zinc-600">&middot;</span>
                              <span className="text-[10px] text-zinc-600">{new Date(ticket.created_at).toLocaleDateString()}</span>
                              {ticket.priority !== 'normal' && <span className={`text-[10px] font-medium capitalize ${ticket.priority === 'urgent' ? 'text-red-400' : ticket.priority === 'high' ? 'text-orange-400' : 'text-zinc-500'}`}>{ticket.priority}</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}