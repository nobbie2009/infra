import React from 'react';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 mb-4 font-mono ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 border-2 flex items-center justify-center text-xs ${
          isUser ? 'border-terminal-secondary text-terminal-secondary' : 'border-terminal-primary text-terminal-primary'
        }`}
      >
        {isUser ? '[U]' : '[A]'}
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-2xl p-3 border text-xs ${
          isUser
            ? 'border-terminal-secondary text-terminal-secondary bg-terminal-surface/30'
            : 'border-terminal-primary text-terminal-primary bg-terminal-surface/50'
        }`}
      >
        {/* Content with Markdown rendering */}
        <div className="prose prose-sm max-w-none [&_h1]:text-terminal-accent [&_h2]:text-terminal-primary [&_h3]:text-terminal-secondary [&_p]:my-0.5 [&_ul]:list-none [&_ol]:list-none [&_li]:pl-2 [&_li]:before:content-['▸'] [&_li]:before:mr-1 [&_li]:before:text-terminal-muted [&_code]:bg-terminal-surface [&_code]:text-terminal-accent [&_pre]:bg-terminal-surface [&_pre]:border-terminal-border [&_pre]:text-terminal-accent [&_blockquote]:border-l-2 [&_blockquote]:border-terminal-muted [&_blockquote]:pl-2">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-xs font-bold mt-1 mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xs font-bold mt-1 mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xs font-bold mt-0.5 mb-0.5">{children}</h3>,
              p: ({ children }) => <p className="my-0.5">{children}</p>,
              ul: ({ children }) => <ul className="list-none my-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-none my-0.5">{children}</ol>,
              li: ({ children }) => <li className="ml-1">{children}</li>,
              code: ({ children }) => (
                <code className="bg-terminal-surface px-1 py-0.5 text-xs font-mono">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="block bg-terminal-surface p-2 my-1 text-xs font-mono overflow-x-auto border border-terminal-border">
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <table className="border-collapse border border-terminal-border text-xs my-1">
                  {children}
                </table>
              ),
              th: ({ children }) => (
                <th className="border border-terminal-border bg-terminal-surface px-1 py-0.5">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-terminal-border px-1 py-0.5">{children}</td>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-terminal-muted pl-2 my-0.5 text-terminal-muted">
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Tools Used Badges */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-terminal-border">
            {message.toolsUsed.map((tool) => (
              <span
                key={tool}
                className="inline-block border border-terminal-accent text-terminal-accent text-xs px-1 py-0.5"
              >
                [{tool}]
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
