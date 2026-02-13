import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  createdAt?: Date;
}

export interface ConfirmationRequest {
  title: string;
  description: string;
  toolName: string;
  toolParams: any;
}

export interface ChatResponse {
  message: string;
  toolsUsed: string[];
  needsConfirmation: boolean;
  confirmationRequest?: ConfirmationRequest;
}

interface UseChatBotOptions {
  sessionId?: string;
  onNewMessage?: (message: ChatMessage) => void;
}

export function useChatBot(options: UseChatBotOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(
    options.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationRequest | null>(null);

  // Load conversation history on mount
  useEffect(() => {
    loadHistory();
  }, [sessionId]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await api.get('/chatbot/history', {
        params: { sessionId, limit: 20 },
      });
      if (response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setError('Failed to load chat history');
    }
  }, [sessionId]);

  const sendMessage = useCallback(
    async (message: string): Promise<ChatResponse | null> => {
      if (!message.trim()) return null;

      setIsLoading(true);
      setError(null);

      try {
        const userMessage: ChatMessage = {
          role: 'user',
          content: message,
        };
        setMessages((prev) => [...prev, userMessage]);
        options.onNewMessage?.(userMessage);

        const response = await api.post('/chatbot/query', {
          message,
          sessionId,
        });

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.data.message,
          toolsUsed: response.data.toolsUsed,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        options.onNewMessage?.(assistantMessage);

        if (response.data.needsConfirmation && response.data.confirmationRequest) {
          setPendingConfirmation(response.data.confirmationRequest);
        }

        return response.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to process query';
        setError(errorMsg);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `❌ Error: ${errorMsg}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
        options.onNewMessage?.(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, options]
  );

  const confirmAction = useCallback(
    async (approved: boolean): Promise<boolean> => {
      if (!approved || !pendingConfirmation) {
        setPendingConfirmation(null);
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post('/chatbot/confirm', {
          toolName: pendingConfirmation.toolName,
          params: pendingConfirmation.toolParams,
        });

        const resultMessage: ChatMessage = {
          role: 'assistant',
          content: `✅ ${response.data.message}\n\n\`\`\`json\n${JSON.stringify(response.data.result, null, 2)}\n\`\`\``,
        };
        setMessages((prev) => [...prev, resultMessage]);
        options.onNewMessage?.(resultMessage);
        setPendingConfirmation(null);
        return true;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to confirm action';
        setError(errorMsg);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `❌ Confirmation failed: ${errorMsg}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
        options.onNewMessage?.(errorMessage);
        setPendingConfirmation(null);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [pendingConfirmation, options]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const newSession = useCallback(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setMessages([]);
    setPendingConfirmation(null);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    pendingConfirmation,
    sendMessage,
    confirmAction,
    clearMessages,
    newSession,
    loadHistory,
  };
}
