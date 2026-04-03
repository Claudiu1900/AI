'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';
import { motion } from 'framer-motion';
import { Bot, User, Copy, Check, Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
import { useState } from 'react';
import { format } from 'date-fns';

export default function ChatMessage({ message, agentName, agentImage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isImage = message.message_type === 'image_generation';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''} group mb-3`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
        isUser
          ? 'bg-indigo-500'
          : 'bg-indigo-500/10'
      }`}>
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <NextImage src="/toxiqailogo.png" alt="AI" width={18} height={18} className="rounded-sm" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] text-zinc-500">
            {isUser ? 'You' : agentName || 'AI'}
          </span>
          <span className="text-[10px] text-zinc-600">
            {message.created_at ? format(new Date(message.created_at), 'HH:mm') : ''}
          </span>
        </div>

        <div className={`relative rounded-lg px-3.5 py-2.5 ${
          isUser
            ? 'bg-indigo-500/15 border border-indigo-500/15'
            : 'bg-white/[0.03] border border-white/[0.05]'
        }`}>
          {isImage ? (
            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[13px] text-indigo-400 mb-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Generated Image</span>
              </div>
              {message.metadata?.image_url && (
                <img
                  src={message.metadata.image_url}
                  alt="Generated"
                  className="rounded-lg max-w-md w-full"
                />
              )}
              <p className="text-[13px] text-zinc-400 mt-1.5">{message.content}</p>
            </div>
          ) : message.message_type === 'image' && message.metadata?.image_url ? (
            <div className="space-y-1.5">
              <img
                src={message.metadata.image_url}
                alt="Uploaded"
                className="rounded-lg max-w-md w-full"
              />
              {message.content && <p className="text-[13px] mt-1.5">{message.content}</p>}
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none text-[13px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <CodeBlock
                        language={match[1]}
                        value={String(children).replace(/\n$/, '')}
                      />
                    ) : (
                      <code className="px-1 py-0.5 rounded bg-white/10 text-indigo-300 text-[0.85em] font-mono" {...props}>
                        {children}
                      </code>
                    );
                  },
                  a({ href, children }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline transition-colors">
                        {children}
                      </a>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-1.5 rounded-lg border border-white/[0.06]">
                        <table className="min-w-full">{children}</table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return <th className="px-2.5 py-1.5 bg-white/[0.03] text-left text-[12px] font-semibold text-zinc-300 border-b border-white/[0.06]">{children}</th>;
                  },
                  td({ children }) {
                    return <td className="px-2.5 py-1.5 text-[13px] border-b border-white/[0.04]">{children}</td>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Copy button */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute -bottom-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-zinc-900 border border-white/[0.06] hover:border-indigo-500/20"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-2.5 h-2.5 text-emerald-400" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-zinc-400" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
