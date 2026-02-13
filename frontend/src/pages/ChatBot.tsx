import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { api } from '../lib/api';
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Infrastructure ChatBot</h1>
            <p className="text-sm text-gray-600">
              Ask me about your infrastructure: VMs, services, logs, metrics, and more!
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-4 mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                Start a conversation! Try asking:
              </p>
              <ul className="mt-4 space-y-2 text-gray-600 text-sm">
                <li>✓ "Sind alle Services okay?"</li>
                <li>✓ "Zeig mir alle VMs"</li>
                <li>✓ "Warum ist DB langsam?"</li>
                <li>✓ "Restart VM-108"</li>
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
                <div className="bg-blue-100 rounded-lg p-3 max-w-md">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">ChatBot is thinking...</span>
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
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendQuery()}
            placeholder="Ask me about your infrastructure..."
            disabled={isLoading || !sessionId}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendQuery}
            disabled={isLoading || !input.trim() || !sessionId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Hint: You can ask about VMs, services, logs, metrics, and create features!
        </p>
      </div>
    </div>
  );
}
