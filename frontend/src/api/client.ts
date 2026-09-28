export type ExplanationType = "gradcam" | "lime" | "shap";

export interface ModelScore {
  model_name: string;
  probabilities: Record<string, number>;
}

export interface PredictionResult {
  predicted_class: string;
  confidence: number;
  class_probabilities: Record<string, number>;
  per_model_scores: ModelScore[];
}

export interface ExplainResult {
  prediction: PredictionResult;
  gradcam?: { heatmap_base64: string } | null;
  lime?: { overlay_base64: string } | null;
  shap?: { heatmap_base64: string } | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function readApiError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return typeof body.detail === "string" ? body.detail : `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export async function uploadAndExplain(
  file: File,
  modelName: string,
  explanationTypes: ExplanationType[]
): Promise<ExplainResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("model_name", modelName);
  explanationTypes.forEach((type) => form.append("explanation_types", type));

  const response = await fetch(`${API_BASE}/api/explain`, { method: "POST", body: form });
  if (!response.ok) throw new Error(await readApiError(response));
  return (await response.json()) as ExplainResult;
}

export async function createImagePreview(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE}/api/preview`, { method: "POST", body: form });
  if (!response.ok) throw new Error(await readApiError(response));
  return URL.createObjectURL(await response.blob());
}

export async function createImagePreviewFromBase64(base64: string, mimeType: string): Promise<string> {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return createImagePreview(new File([bytes], "history-image", { type: mimeType }));
}

export async function streamChatMessage(
  messages: ChatMessage[],
  prediction: PredictionResult | undefined,
  onText: (text: string) => void
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ messages, context: prediction ?? null }),
    });
  } catch {
    throw new Error("I can’t reach the chat service right now. Please try again in a moment.");
  }

  if (response.status === 404) {
    throw new Error("The Gemini chat endpoint is not active yet. Please restart the backend and try again.");
  }
  if (!response.ok) throw new Error(await readApiError(response));
  if (!response.body) throw new Error("The chat response could not be streamed. Please try again.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = event.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
        if (data === "[DONE]") return;
        if (data) {
          const payload = JSON.parse(data) as { text?: string; message?: string };
          if (event.startsWith("event: error")) throw new Error(payload.message ?? "Gemini could not finish the reply.");
          if (payload.text) onText(payload.text);
        }
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}
