import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-body prose prose-invert max-w-none text-zinc-200 text-sm md:text-base leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const [copied, setCopied] = useState(false);

            if (!inline && match) {
              return (
                <div className="relative my-3 rounded-xl overflow-hidden border border-zinc-800 bg-[#0d1117] font-mono text-xs md:text-sm shadow-xl">
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-zinc-800/80 text-zinc-400 select-none">
                    <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                      {match[1]}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(codeString);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 hover:text-white transition-all text-xs"
                      title="Copy code"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-zinc-100 leading-normal">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            }

            // Inline code
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-amber-300 font-mono text-xs md:text-sm border border-zinc-700/40"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-xl md:text-2xl font-bold text-white mt-5 mb-3 border-b border-zinc-800 pb-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg md:text-xl font-bold text-white mt-4 mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base md:text-lg font-semibold text-zinc-100 mt-3 mb-2">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 mb-3 space-y-1 text-zinc-200">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 mb-3 space-y-1 text-zinc-200">{children}</ol>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-amber-500/80 pl-4 py-1 my-3 italic text-zinc-300 bg-amber-500/5 rounded-r">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-zinc-800">
                <table className="min-w-full divide-y divide-zinc-800 text-left text-xs md:text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-zinc-800/70 text-zinc-300 font-semibold">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/30">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-zinc-800/20 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return <th className="px-4 py-2 text-zinc-300 font-medium">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-2 text-zinc-200">{children}</td>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                {children}
              </a>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
