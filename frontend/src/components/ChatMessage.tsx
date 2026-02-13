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
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-gray-200' : 'bg-blue-600'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-gray-700" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-2xl rounded-lg p-4 ${
          isUser
            ? 'bg-gray-200 text-gray-900'
            : 'bg-blue-50 text-gray-900 border border-blue-100'
        }`}
      >
        {/* Content with Markdown rendering */}
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-lg font-bold mt-2 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold mt-2 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="font-bold mt-1 mb-1">{children}</h3>,
              p: ({ children }) => <p className="my-1">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside my-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside my-1">{children}</ol>,
              li: ({ children }) => <li className="ml-2">{children}</li>,
              code: ({ children }) => (
                <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="block bg-gray-900 text-gray-100 p-3 rounded my-1 text-xs font-mono overflow-x-auto">
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <table className="border-collapse border border-gray-300 text-xs my-1">
                  {children}
                </table>
              ),
              th: ({ children }) => (
                <th className="border border-gray-300 bg-gray-200 px-2 py-1">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 px-2 py-1">{children}</td>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-3 italic my-1">
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
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-300">
            {message.toolsUsed.map((tool) => (
              <span
                key={tool}
                className="inline-block bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded"
              >
                🔧 {tool}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
