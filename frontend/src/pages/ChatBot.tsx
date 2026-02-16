import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import api from '../lib/api';
import ChatMessage from '../components/ChatMessage';
import ConfirmationDialog from '../components/ConfirmationDialog';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  createdAt?: Date;
}

interface ConfirmationRequest {
  title: string;
  description: string;
  toolName: string;
  toolParams: any;
}

export default function ChatBotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const [pendingConfirmation, setPendingConfirmation] =
    useState<ConfirmationRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session on mount
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    loadHistory(newSessionId);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = async (sId: string) => {
    try {
      const response = await api.get('/chatbot/history', {
        params: { sessionId: sId, limit: 20 },
      });
      if (response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const sendQuery = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/chatbot/query', {
        message: input,
        sessionId,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message,
        toolsUsed: response.data.toolsUsed,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Check if confirmation is needed
      if (response.data.needsConfirmation && response.data.confirmationRequest) {
        setPendingConfirmation(response.data.confirmationRequest);
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to process query';
      setError(errorMsg);
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error: ${errorMsg}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmation = async (approved: boolean) => {
    if (!approved || !pendingConfirmation) {
      setPendingConfirmation(null);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/chatbot/confirm', {
        toolName: pendingConfirmation.toolName,
        params: pendingConfirmation.toolParams,
      });

      const resultMessage: Message = {
        role: 'assistant',
        content: `✅ ${response.data.message}\n\n${JSON.stringify(response.data.result, null, 2)}`,
      };

      setMessages((prev) => [...prev, resultMessage]);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to confirm action';
      setError(errorMsg);
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Confirmation failed: ${errorMsg}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setPendingConfirmation(null);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-terminal-bg">
      {/* Header */}
      <div className="bg-terminal-surface border-b border-terminal-border px-6 py-4 shadow-terminal-glow">
        <div className="flex items-center gap-3">
          <div className="bg-terminal-primary text-terminal-bg p-2">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-terminal-primary font-mono text-glow section-header">Infrastructure ChatBot</h1>
            <p className="text-sm text-terminal-secondary font-mono">
              Ask me about your infrastructure: VMs, services, logs, metrics, and more!
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-terminal-surface border-l-4 border-terminal-danger p-4 mx-4 mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-terminal-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-terminal-danger font-mono">[ ERROR ] {error}</p>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 font-mono">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-terminal-muted mx-auto mb-4" />
              <p className="text-terminal-secondary text-lg font-mono">
                [ INITIALIZING CHAT INTERFACE ]
              </p>
              <p className="text-terminal-muted mt-2">Try asking:</p>
              <ul className="mt-4 space-y-2 text-terminal-secondary text-sm font-mono">
                <li>&gt; "Sind alle Services okay?"</li>
                <li>&gt; "Zeig mir alle VMs"</li>
                <li>&gt; "Warum ist DB langsam?"</li>
                <li>&gt; "Restart VM-108"</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} />
            ))}
            {isLoading && (
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-terminal-surface border border-terminal-primary p-3 max-w-md">
                  <div className="flex items-center gap-2 text-terminal-primary animate-flicker">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-mono">[ PROCESSING ]</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {pendingConfirmation && (
        <ConfirmationDialog
          title={pendingConfirmation.title}
          description={pendingConfirmation.description}
          onConfirm={() => handleConfirmation(true)}
          onCancel={() => handleConfirmation(false)}
        />
      )}

      {/* Input Area */}
      <div className="bg-terminal-surface border-t border-terminal-border px-6 py-4">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendQuery()}
            placeholder="[ QUERY ]"
            disabled={isLoading || !sessionId}
            className="input-terminal flex-1"
          />
          <button
            onClick={sendQuery}
            disabled={isLoading || !input.trim() || !sessionId}
            className="btn-terminal"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">[ SEND ]</span>
          </button>
        </div>
        <p className="text-xs text-terminal-muted mt-2 font-mono">
          # Ask about VMs, services, logs, metrics, or create features
        </p>
      </div>
    </div>
  );
}
