'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Code } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  // Generate a name for the code snippet
  const getSnippetName = () => {
    const lang = language || 'code';
    const firstLine = value.split('\n')[0].trim();

    // Try to extract function/class name
    const funcMatch = firstLine.match(/(?:function|const|let|var|class|def|fn|func)\s+(\w+)/);
    if (funcMatch) return `${funcMatch[1]}.${lang}`;

    // Try to extract import name
    const importMatch = firstLine.match(/(?:import|from|require)\s+['"]?(\w+)/);
    if (importMatch) return `${importMatch[1]}_import.${lang}`;

    return `snippet.${lang}`;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyName = async () => {
    await navigator.clipboard.writeText(getSnippetName());
  };

  return (
    <div className="code-block-wrapper my-3 rounded-xl overflow-hidden">
      <div className="code-block-header">
        <div className="flex items-center space-x-2">
          <Code className="w-3.5 h-3.5" />
          <button
            onClick={handleCopyName}
            className="font-mono text-xs hover:text-white transition-colors cursor-pointer"
            title="Click to copy filename"
          >
            {getSnippetName()}
          </button>
          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-[11px]"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.4)',
          fontSize: '0.85rem',
          lineHeight: '1.6',
        }}
        showLineNumbers
        lineNumberStyle={{ color: 'rgba(255,255,255,0.15)', minWidth: '2.5em' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
