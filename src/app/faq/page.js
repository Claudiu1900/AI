'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, MessageSquare, Sparkles, Shield, Zap, Globe, Lock } from 'lucide-react';

const faqCategories = [
  {
    title: 'Getting Started',
    icon: Sparkles,
    color: 'text-indigo-400 bg-indigo-500/10',
    questions: [
      {
        q: 'How do I start using ToxiQ AI?',
        a: 'Create an account by clicking "Get Started" on the homepage. Once registered, log in and navigate to the Chat page. An admin needs to grant you access to AI models before you can start chatting.'
      },
      {
        q: 'How do I select an AI model?',
        a: 'In the Chat page, click the model selector dropdown in the top-right corner of the chat area. You\'ll see all AI models you have access to. Click one to select it, then start a new chat.'
      },
      {
        q: 'Can I use multiple AI models?',
        a: 'Yes! You can switch between different AI models by using the model selector. Each conversation is linked to a specific model, but you can create new conversations with different models.'
      },
    ]
  },
  {
    title: 'Chat Features',
    icon: MessageSquare,
    color: 'text-violet-400 bg-violet-500/10',
    questions: [
      {
        q: 'Can I send images to the AI?',
        a: 'Yes! Click the image icon in the chat input area to upload an image. The AI can analyze and describe the image, answer questions about it, or use it as context for the conversation.'
      },
      {
        q: 'How does voice recording work?',
        a: 'Click the microphone icon to start recording your voice. When you stop, the audio is transcribed into text and added to the input field. This uses your browser\'s built-in speech recognition for instant results.'
      },
      {
        q: 'Can I download or share conversations?',
        a: 'Yes! When viewing a conversation, click the download icon to export it as a text file, or click the share icon to copy the entire conversation to your clipboard.'
      },
      {
        q: 'How do I delete a conversation?',
        a: 'Hover over a conversation in the sidebar and click the trash icon that appears. You can also delete all conversations from the Settings page under the Account tab.'
      },
    ]
  },
  {
    title: 'Image Generation',
    icon: Zap,
    color: 'text-emerald-400 bg-emerald-500/10',
    questions: [
      {
        q: 'How does image generation work?',
        a: 'If your AI model supports image generation, simply describe the image you want. The AI will enhance your prompt and generate a high-quality image using advanced diffusion models. You can describe in any language — the system automatically translates and enhances your prompt.'
      },
      {
        q: 'What image quality can I expect?',
        a: 'Images are generated at 1024x1024 resolution using state-of-the-art models like FLUX-2 or DALL-E 3. The AI automatically enhances your prompt with style details, lighting, and composition for best results.'
      },
    ]
  },
  {
    title: 'Account & Security',
    icon: Shield,
    color: 'text-amber-400 bg-amber-500/10',
    questions: [
      {
        q: 'How do I change my password?',
        a: 'Go to Settings > Security tab. Enter your new password and confirm it, then click "Change Password". Your password must be at least 6 characters long.'
      },
      {
        q: 'What are the user roles?',
        a: 'There are three roles: User (default, can chat with granted models), Admin (can manage users and AI agents), and Owner (full platform control). Roles are assigned by administrators.'
      },
      {
        q: 'Is my data secure?',
        a: 'Yes. All data is stored securely with row-level security policies. Your conversations are only accessible to you. The platform uses industry-standard encryption for all communications.'
      },
    ]
  },
  {
    title: 'Usage & Limits',
    icon: Globe,
    color: 'text-cyan-400 bg-cyan-500/10',
    questions: [
      {
        q: 'What are prompt limits?',
        a: 'Each AI model has a prompt limit assigned to your account. This is the maximum number of messages you can send with that model. Check your remaining prompts in the model selector dropdown. ∞ means unlimited.'
      },
      {
        q: 'What happens when I reach my limit?',
        a: 'You\'ll see an error message when trying to send more messages. Contact an administrator to request additional prompts or switch to a different AI model.'
      },
      {
        q: 'Can I get unlimited prompts?',
        a: 'Administrators can set your prompt limit to unlimited (∞) for any AI model. Contact your administrator or use the Support page to request this.'
      },
    ]
  },
];

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      layout
      className="border border-white/[0.05] rounded-xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.03] transition-colors"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="text-[13px] font-medium pr-4">{question}</span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-[13px] text-zinc-400 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState(null);

  const displayCategories = activeCategory
    ? faqCategories.filter((_, i) => i === activeCategory)
    : faqCategories;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Frequently Asked Questions</h1>
          <p className="text-sm text-zinc-400">Find answers to common questions about ToxiQ AI</p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              activeCategory === null
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            All
          </button>
          {faqCategories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <button
                key={i}
                onClick={() => setActiveCategory(activeCategory === i ? null : i)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  activeCategory === i
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.title}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ sections */}
        <div className="space-y-8">
          {displayCategories.map((category, catIdx) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: catIdx * 0.05 }}
              >
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`w-7 h-7 rounded-lg ${category.color} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-semibold">{category.title}</h2>
                </div>
                <div className="space-y-2">
                  {category.questions.map((item, i) => (
                    <FAQItem key={i} question={item.q} answer={item.a} />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-10 p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl"
        >
          <p className="text-sm text-zinc-400 mb-3">Still have questions?</p>
          <a
            href="/support"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[13px] font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/20"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Contact Support</span>
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
