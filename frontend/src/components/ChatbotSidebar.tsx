import React, { useState, useEffect, useRef } from "react";
import { sendChatMessage, type ChatMessage, type ExplainResult } from "../api/client";
import { saveChatHistory, loadChatHistory, clearChatHistory } from "../services/chatService";

interface ChatbotSidebarProps {
  currentResult?: ExplainResult | null;
}

export const ChatbotSidebar: React.FC<ChatbotSidebarProps> = ({ currentResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const savedMessages = loadChatHistory();
    if (savedMessages.length > 0) {
      setMessages(savedMessages);
    } else {
      // Initialize with welcome message
      setMessages([
        {
          role: "assistant",
          content: "Hello! I'm your AI assistant. I can help answer questions about colorectal cancer, histology classification, and general topics. How can I help you today?"
        }
      ]);
    }
  }, []);

  // Save chat history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue.trim()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        newMessages,
        currentResult?.prediction
      );

      setMessages([...newMessages, {
        role: "assistant",
        content: response.message
      }]);
    } catch (err: any) {
      setError(err.message || "Failed to get response. Please try again.");
      // Remove the user message on error
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInjectContext = () => {
    if (!currentResult) return;

    const contextMessage = `I just analyzed a histology image. The classification result is: ${currentResult.prediction.predicted_class} with ${(currentResult.prediction.confidence * 100).toFixed(1)}% confidence. Can you explain what this means?`;
    
    setInputValue(contextMessage);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      clearChatHistory();
      setMessages([
        {
          role: "assistant",
          content: "Chat history cleared. How can I help you?"
        }
      ]);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        className="chatbot-toggle-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
        title={isOpen ? "Close chatbot" : "Open chatbot"}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Sidebar */}
      {isOpen && (
        <div className="chatbot-sidebar">
          <div className="chatbot-header">
            <h3>AI Assistant</h3>
            <div className="chatbot-header-actions">
              {currentResult && (
                <button
                  className="chatbot-context-button"
                  onClick={handleInjectContext}
                  title="Share current classification context"
                >
                  Share Context
                </button>
              )}
              <button
                className="chatbot-clear-button"
                onClick={handleClearChat}
                title="Clear chat history"
              >
                Clear
              </button>
              <button
                className="chatbot-close-button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot"
              >
                ×
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chatbot-message chatbot-message--${msg.role}`}
              >
                <div className="chatbot-message-content">{msg.content}</div>
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message chatbot-message--assistant">
                <div className="chatbot-message-content">
                  <span className="chatbot-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="chatbot-error">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-container">
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button
              className="chatbot-send-button"
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
