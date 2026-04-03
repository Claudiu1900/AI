'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from '@/components/ChatMessage';
import VoiceRecorder from '@/components/VoiceRecorder';
import Image from 'next/image';
import toast from 'react-hot-toast';
import {
  Plus, Send, Image as ImageIcon, Trash2,
  MessageSquare, Search, ChevronDown, Bot, Loader2,
  PanelLeftClose, PanelLeftOpen, Sparkles, X,
  Download, Share2, Copy, Check
} from 'lucide-react';

export default function ChatPage() {
  const { user, profile, supabase, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConv, setCurrentConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [convsLoading, setConvsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [shareLink, setShareLink] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch user's accessible agents
  useEffect(() => {
    if (!user || authLoading) return;
    const fetchAgents = async () => {
      try {
        const { data: access } = await supabase
          .from('user_ai_access')
          .select('*, ai_agents(*)')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (access && access.length > 0) {
          const agentList = access
            .filter(a => a.ai_agents?.is_active)
            .map(a => ({
              ...a.ai_agents,
              allowed_prompts: a.allowed_prompts,
              used_prompts: a.used_prompts,
            }));
          setAgents(agentList);
          if (agentList.length > 0 && !selectedAgent) {
            const defaultAgent = agentList.find(a => a.is_default) || agentList[0];
            setSelectedAgent(defaultAgent);
          }
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      }
    };
    fetchAgents();
  }, [user, authLoading]);

  // Fetch conversations
  useEffect(() => {
    if (!user || authLoading) return;
    const fetchConversations = async () => {
      setConvsLoading(true);
      try {
        const { data } = await supabase
          .from('conversations')
          .select('*, ai_agents(name, image_url)')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        setConversations(data || []);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setConvsLoading(false);
      }
    };
    fetchConversations();
  }, [user, authLoading]);

  // Fetch messages for current conversation
  useEffect(() => {
    if (!currentConv) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentConv.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();

    // Real-time subscription for messages
    const channel = supabase
      .channel(`messages:${currentConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${currentConv.id}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConv]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewChat = async () => {
    if (!selectedAgent) {
      toast.error('Please select an AI model first');
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        ai_agent_id: selectedAgent.id,
        title: 'New Chat',
      })
      .select('*, ai_agents(name, image_url)')
      .single();

    if (error) {
      toast.error('Failed to create chat');
      return;
    }

    setConversations(prev => [data, ...prev]);
    setCurrentConv(data);
    setMessages([]);
    inputRef.current?.focus();
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', convId);

    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (currentConv?.id === convId) {
        setCurrentConv(null);
        setMessages([]);
      }
      toast.success('Chat deleted');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be under 10MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download conversation as text
  const downloadConversation = () => {
    if (!currentConv || messages.length === 0) return;
    const text = messages.map(m => {
      const role = m.role === 'user' ? 'You' : (selectedAgent?.name || 'AI');
      const time = m.created_at ? new Date(m.created_at).toLocaleString() : '';
      return `[${time}] ${role}:\n${m.content}\n`;
    }).join('\n---\n\n');
    const header = `# ${currentConv.title}\n# Exported from ToxiQ AI\n# ${new Date().toLocaleString()}\n\n`;
    const blob = new Blob([header + text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentConv.title?.replace(/[^a-z0-9]/gi, '_') || 'chat'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conversation downloaded');
  };

  // Copy conversation to clipboard (share)
  const shareConversation = async () => {
    if (!currentConv || messages.length === 0) return;
    const text = messages.map(m => {
      const role = m.role === 'user' ? 'You' : (selectedAgent?.name || 'AI');
      return `${role}: ${m.content}`;
    }).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setShareLink(true);
      setTimeout(() => setShareLink(false), 2000);
      toast.success('Conversation copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if ((!input.trim() && !imageFile) || sending) return;

    if (!currentConv && !selectedAgent) {
      toast.error('Please select an AI model first');
      return;
    }

    let conv = currentConv;

    // Create conversation if needed
    if (!conv) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          ai_agent_id: selectedAgent.id,
          title: input.slice(0, 50) || 'New Chat',
        })
        .select('*, ai_agents(name, image_url)')
        .single();

      if (error) {
        toast.error('Failed to create chat');
        return;
      }
      conv = data;
      setCurrentConv(data);
      setConversations(prev => [data, ...prev]);
    }

    const messageContent = input.trim();
    const msgType = imageFile ? 'image' : 'text';
    setInput('');
    setSending(true);

    let imageUrl = null;
    if (imageFile) {
      // Upload image to a data URL for the API
      const reader = new FileReader();
      imageUrl = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(imageFile);
      });
    }

    // Save user message
    const { data: userMsg } = await supabase
      .from('messages')
      .insert({
        conversation_id: conv.id,
        role: 'user',
        content: messageContent || '[Image]',
        message_type: msgType,
        metadata: imageUrl ? { image_url: imageUrl } : {},
      })
      .select()
      .single();

    if (userMsg) {
      setMessages(prev => [...prev, userMsg]);
    }

    removeImage();

    // Determine the agent for this conversation
    const agent = selectedAgent || agents.find(a => a.id === conv.ai_agent_id);
    if (!agent) {
      toast.error('No AI model available');
      setSending(false);
      return;
    }

    // Check prompt limits (-1 means unlimited)
    if (agent.allowed_prompts !== -1 && agent.used_prompts >= agent.allowed_prompts) {
      toast.error('You have reached your prompt limit for this model');
      setSending(false);
      return;
    }

    try {
      // Check if this is an image generation request
      if (agent.supports_image_generation) {
        const res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: messageContent, model: agent.model, api_type: agent.api_type }),
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        const { data: aiMsg } = await supabase
          .from('messages')
          .insert({
            conversation_id: conv.id,
            role: 'assistant',
            content: messageContent,
            message_type: 'image_generation',
            metadata: { image_url: data.url },
          })
          .select()
          .single();

        if (aiMsg) setMessages(prev => [...prev, aiMsg]);
      } else if (agent.supports_video_generation) {
        const res = await fetch('/api/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: messageContent, model: agent.model, api_key_env: agent.api_key_env }),
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        const { data: aiMsg } = await supabase
          .from('messages')
          .insert({
            conversation_id: conv.id,
            role: 'assistant',
            content: messageContent,
            message_type: 'video_generation',
            metadata: { video_url: data.url },
          })
          .select()
          .single();

        if (aiMsg) setMessages(prev => [...prev, aiMsg]);
      } else {
        // Regular chat
        const chatHistory = messages.slice(-20).map(m => ({
          role: m.role,
          content: m.content,
          ...(m.metadata?.image_url && m.role === 'user' ? { image_url: m.metadata.image_url } : {}),
        }));

        chatHistory.push({
          role: 'user',
          content: messageContent || 'What do you see in this image?',
          ...(imageUrl ? { image_url: imageUrl } : {}),
        });

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: chatHistory,
            model: agent.model,
            api_type: agent.api_type,
            system_prompt: agent.system_prompt,
            max_tokens: agent.max_tokens,
            temperature: agent.temperature,
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const { data: aiMsg } = await supabase
          .from('messages')
          .insert({
            conversation_id: conv.id,
            role: 'assistant',
            content: data.content,
            message_type: 'text',
            tokens_used: data.tokens || 0,
          })
          .select()
          .single();

        if (aiMsg) setMessages(prev => [...prev, aiMsg]);
      }

      // Update conversation title if first message
      if (messages.length === 0 && messageContent) {
        await supabase
          .from('conversations')
          .update({ title: messageContent.slice(0, 80) })
          .eq('id', conv.id);

        setConversations(prev =>
          prev.map(c => c.id === conv.id ? { ...c, title: messageContent.slice(0, 80) } : c)
        );
      }

      // Increment prompt usage
      await supabase.rpc('increment_prompt_usage', {
        p_user_id: user.id,
        p_agent_id: agent.id,
      });

    } catch (err) {
      toast.error(err.message || 'Failed to get AI response');
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const filteredConversations = conversations.filter(c =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleVoiceTranscription = (text) => {
    setInput(prev => prev + (prev ? ' ' : '') + text);
    inputRef.current?.focus();
  };

  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-3"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Image src="/toxiqailogo.png" alt="Loading" width={24} height={24} className="rounded-md" />
            </div>
            <div className="absolute inset-0 rounded-xl border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          </div>
          <p className="text-xs text-zinc-500">Loading ToxiQ AI...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed md:relative inset-y-0 left-0 top-14 z-40 md:z-auto flex-shrink-0 bg-[#09090b]/98 md:bg-[#09090b]/95 backdrop-blur-lg border-r border-white/[0.04] flex flex-col overflow-hidden"
          >
            <div className="p-3 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-semibold text-zinc-200">Chats</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-md hover:bg-white/[0.04] transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4 text-zinc-500" />
                </button>
              </div>

              <button
                onClick={createNewChat}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/30 transition-colors text-[13px] font-medium text-indigo-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>

              <div className="relative mt-2.5">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 z-10 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="input-dark pl-8 py-1.5 text-[13px]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {convsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg shimmer" />
                ))
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
                  <p className="text-[13px] text-zinc-500">No chats yet</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setCurrentConv(conv);
                      const agent = agents.find(a => a.id === conv.ai_agent_id);
                      if (agent) setSelectedAgent(agent);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`w-full text-left sidebar-item flex items-center space-x-2.5 group ${
                      currentConv?.id === conv.id ? 'active' : ''
                    }`}
                  >
                    <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{conv.title}</p>
                      <p className="text-[11px] text-zinc-500">
                        {conv.ai_agents?.name || 'AI'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="bg-[#09090b]/90 backdrop-blur-lg border-b border-white/[0.04] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1 rounded-md hover:bg-white/[0.04] transition-colors"
              >
                <PanelLeftOpen className="w-4 h-4 text-zinc-500" />
              </button>
            )}
            <div>
              <h3 className="text-[13px] font-medium">
                {currentConv?.title || 'New Chat'}
              </h3>
              <p className="text-[11px] text-zinc-500">
                {selectedAgent?.name || 'Select an AI model'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Share & Download buttons */}
            {currentConv && messages.length > 0 && (
              <>
                <button
                  onClick={shareConversation}
                  className="p-1.5 rounded-lg hover:bg-white/[0.04] text-zinc-500 hover:text-indigo-400 transition-colors"
                  title="Copy conversation"
                >
                  {shareLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={downloadConversation}
                  className="p-1.5 rounded-lg hover:bg-white/[0.04] text-zinc-500 hover:text-indigo-400 transition-colors"
                  title="Download conversation"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <div className="relative">
              <button
                onClick={() => setShowAgentPicker(!showAgentPicker)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-colors text-[13px]"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-zinc-300">{selectedAgent?.name || 'Select Model'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${showAgentPicker ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showAgentPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-1.5 w-64 bg-[#0c0c14] border border-white/[0.06] rounded-xl p-1.5 shadow-xl z-50"
                >
                  {agents.length === 0 ? (
                    <div className="p-4 text-center">
                      <Bot className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
                      <p className="text-[13px] text-zinc-400">No AI models available</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Ask an admin to grant you access</p>
                    </div>
                  ) : (
                    agents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => { setSelectedAgent(agent); setShowAgentPicker(false); }}
                        className={`w-full flex items-center space-x-2.5 p-2 rounded-lg transition-colors ${
                          selectedAgent?.id === agent.id ? 'bg-indigo-500/10 border border-indigo-500/15' : 'hover:bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-[13px] font-medium">{agent.name}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{agent.description}</p>
                            <p className="text-[10px] text-indigo-400 mt-0.5">
                              {agent.allowed_prompts === -1 ? '∞' : `${agent.used_prompts}/${agent.allowed_prompts}`} prompts
                            </p>
                        </div>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {messages.length === 0 && !currentConv ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold mb-1.5">Start a conversation</h2>
                <p className="text-[13px] text-zinc-400 mb-5">Select an AI model and start chatting. Conversations are saved automatically.</p>
                {agents.length > 0 && (
                  <button
                    onClick={createNewChat}
                    className="text-[13px] font-medium bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    New Chat
                  </button>
                )}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                agentName={selectedAgent?.name}
                agentImage={selectedAgent?.image_url}
                userAvatar={profile?.avatar_url}
              />
            ))
          )}

          {sending && (
            <div className="flex items-center space-x-2.5 p-3">
              <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="flex space-x-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Image preview */}
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="px-3 pb-1.5"
            >
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-16 rounded-lg border border-white/[0.06]" />
                <button
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="bg-[#09090b]/90 backdrop-blur-lg border-t border-white/[0.04] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Agent selector row */}
          {agents.length > 1 && (
            <div className="flex items-center space-x-1.5 mb-2 overflow-x-auto pb-1 scrollbar-hide">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                    selectedAgent?.id === agent.id
                      ? 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-300'
                      : 'bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  <span>{agent.name}</span>
                  {agent.is_default && <span className="text-[8px] text-amber-400">★</span>}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={sendMessage} className="flex items-end space-x-2">
            {/* Image upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-white/[0.04] text-zinc-500 hover:text-indigo-400 transition-colors"
              title="Upload image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Voice recorder */}
            <VoiceRecorder onTranscription={handleVoiceTranscription} disabled={sending} />

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={agents.length === 0 ? "No AI models available..." : "Type a message..."}
                disabled={agents.length === 0 || sending}
                rows={1}
                className="input-dark pl-3.5 resize-none min-h-[40px] max-h-32 pr-10 text-[13px]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />
            </div>

            {/* Send button */}
            <button
              type="submit"
              disabled={(!input.trim() && !imageFile) || sending || agents.length === 0}
              className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
