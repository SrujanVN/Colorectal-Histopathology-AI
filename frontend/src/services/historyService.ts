import type { ExplainResult, ExplanationType } from "../api/client";

export interface HistoryItem {
  id: string; // unique identifier (timestamp-based)
  timestamp: number; // Date.now()
  fileName: string; // original file name
  imageBase64: string; // base64 encoded image
  imageMimeType: string; // MIME type (e.g., "image/png", "image/jpeg")
  modelName: string; // selected model
  explanationTypes: ExplanationType[]; // selected explanations
  result: ExplainResult; // full prediction result
}

const STORAGE_KEY = "colorectal_history";
const MAX_HISTORY_ITEMS = 50;

/**
 * Convert File to base64 string and MIME type
 */
async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract MIME type and base64 data
      const [header, base64] = result.split(",");
      const mimeTypeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Save a new prediction result to history
 */
export async function saveToHistory(
  file: File,
  modelName: string,
  explanationTypes: ExplanationType[],
  result: ExplainResult
): Promise<void> {
  try {
    const { base64: imageBase64, mimeType: imageMimeType } = await fileToBase64(file);
    const historyItem: HistoryItem = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      fileName: file.name,
      imageBase64,
      imageMimeType,
      modelName,
      explanationTypes,
      result,
    };

    const existingHistory = getHistory();
    const newHistory = [historyItem, ...existingHistory].slice(
      0,
      MAX_HISTORY_ITEMS
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("historyUpdated"));
  } catch (error) {
    console.error("Failed to save to history:", error);
    // Handle quota exceeded or other localStorage errors gracefully
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      // Try to free up space by removing oldest items
      const existingHistory = getHistory();
      const reducedHistory = existingHistory.slice(0, Math.floor(MAX_HISTORY_ITEMS / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedHistory));
        // Retry saving the new item
        const { base64: imageBase64, mimeType: imageMimeType } = await fileToBase64(file);
        const historyItem: HistoryItem = {
          id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          fileName: file.name,
          imageBase64,
          imageMimeType,
          modelName,
          explanationTypes,
          result,
        };
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify([historyItem, ...reducedHistory])
        );
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event("historyUpdated"));
      } catch (retryError) {
        console.error("Failed to save to history after cleanup:", retryError);
        throw new Error("History storage is full. Please clear some items.");
      }
    } else {
      throw error;
    }
  }
}

/**
 * Retrieve all history items, sorted by timestamp (newest first)
 */
export function getHistory(): HistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as HistoryItem[];
    // Sort by timestamp descending (newest first)
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to retrieve history:", error);
    return [];
  }
}

/**
 * Delete a specific history item by ID
 */
export function deleteHistoryItem(id: string): void {
  try {
    const history = getHistory();
    const filtered = history.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("historyUpdated"));
  } catch (error) {
    console.error("Failed to delete history item:", error);
    throw error;
  }
}

/**
 * Clear all history items
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("historyUpdated"));
  } catch (error) {
    console.error("Failed to clear history:", error);
    throw error;
  }
}

/**
 * Get the current number of history items
 */
export function getHistorySize(): number {
  return getHistory().length;
}

