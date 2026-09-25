import type { ChatMessage } from "../api/client";

const CHAT_HISTORY_KEY = "colorectal_chat_history";

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export function saveChatHistory(messages: ChatMessage[]): void {
  try {
    const session: ChatSession = {
      id: "current",
      messages,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Failed to save chat history:", error);
  }
}

export function loadChatHistory(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!stored) return [];
    
    const session: ChatSession = JSON.parse(stored);
    return session.messages || [];
  } catch (error) {
    console.warn("Failed to load chat history:", error);
    return [];
  }
}

export function clearChatHistory(): void {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  } catch (error) {
    console.warn("Failed to clear chat history:", error);
  }
}
