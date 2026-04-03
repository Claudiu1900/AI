'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';
import { motion } from 'framer-motion';
import { Bot, User, Copy, Check, Image as ImageIcon, Download, Video, Play } from 'lucide-react';
import NextImage from 'next/image';
import { useState, useRef } from 'react';
import { format } from 'date-fns';

export default function ChatMessage({ message, agentName, agentImage, userAvatar }) {
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);
  const isUser = message.role === 'user';
  const isImage = message.message_type === 'image_generation';
  const isVideo = message.message_type === 'video_generation';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''} group mb-3`}
    >
      {/* Avatar */}
      {isUser && userAvatar ? (
        <img src={userAvatar} alt="" className="flex-shrink-0 w-7 h-7 rounded-md object-cover" />
      ) : (
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
      )}

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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[13px] text-indigo-400">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="font-medium">Generated Image</span>
                </div>
                {message.metadata?.image_url && (
                  <button
                    onClick={() => handleDownload(message.metadata.image_url, `image-${Date.now()}.png`)}
                    className="flex items-center space-x-1 px-2 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] text-zinc-300 transition-colors"
                    title="Download image"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                )}
              </div>
              {message.metadata?.image_url && (
                <div className="relative group/img rounded-xl overflow-hidden border border-white/[0.08] bg-black/20">
                  <img
                    src={message.metadata.image_url}
                    alt="Generated"
                    className={`w-full max-w-lg rounded-xl transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                  />
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              )}
              <p className="text-[12px] text-zinc-500 italic">{message.content}</p>
            </div>
          ) : isVideo ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[13px] text-purple-400">
                  <Video className="w-3.5 h-3.5" />
                  <span className="font-medium">Generated Video</span>
                </div>
                {message.metadata?.video_url && (
                  <button
                    onClick={() => handleDownload(message.metadata.video_url, `video-${Date.now()}.mp4`)}
                    className="flex items-center space-x-1 px-2 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] text-zinc-300 transition-colors"
                    title="Download video"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                )}
              </div>
              {message.metadata?.video_url && (
                <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-black/30 max-w-lg">
                  <video
                    ref={videoRef}
                    src={message.metadata.video_url}
                    className="w-full rounded-xl"
                    controls
                    playsInline
                    preload="metadata"
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                    onEnded={() => setVideoPlaying(false)}
                  />
                  {!videoPlaying && (
                    <div
                      className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 hover:bg-black/10 transition-colors"
                      onClick={() => videoRef.current?.play()}
                    >
                      <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <Play className="w-6 h-6 text-white ml-1" fill="white" />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <p className="text-[12px] text-zinc-500 italic">{message.content}</p>
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
