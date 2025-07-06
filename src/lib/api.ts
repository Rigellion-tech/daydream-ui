// src/lib/api.ts

// --- Typed interfaces for API requests & responses ---
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  user_id: string;
  message?: string;
  image_url?: string;
  messages?: ChatMessage[];
}

interface ChatResponse {
  response?: string;
  error?: string;
}

interface ImageResponse {
  imageUrl?: string;
  error?: string;
}

// --- Helper to manage or generate a persistent user ID ---
export function getUserId(): string {
  if (typeof window === "undefined") return "user-temp";
  let id = localStorage.getItem("user_id");
  if (!id) {
    id = `user-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("user_id", id);
  }
  return id;
}

/**
 * Send a single chat message (non-streaming) to the backend.
 */
export async function sendMessageToBackend(
  message: string,
  imageUrl?: string
): Promise<string> {
  const user_id = getUserId();
  const payload: ChatRequest = { user_id };
  if (message) payload.message = message;
  if (imageUrl) payload.image_url = imageUrl;

  try {
    const res = await fetch(
      "https://daydreamforge.onrender.com/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = (await res.json()) as ChatResponse;
    if (!res.ok || data.error) {
      console.error(`Chat API error: ${data.error || res.status}`);
      return data.error ?? "";
    }
    return data.response ?? "";
  } catch (err) {
    console.error("sendMessageToBackend failed:", err);
    return "";
  }
}

/**
 * Request an AI-generated image from the backend.
 */
export async function generateImage(
  prompt: string,
  highQuality = false
): Promise<string> {
  const user_id = getUserId();
  try {
    const res = await fetch(
      "https://daydreamforge.onrender.com/image",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          useHighQuality: highQuality,
          user_id,
        }),
      }
    );
    const data = (await res.json()) as ImageResponse;
    if (!res.ok || data.error || !data.imageUrl) {
      console.error(`Image API error: ${data.error || res.status}`);
      return "";
    }
    return data.imageUrl;
  } catch (err) {
    console.error("generateImage failed:", err);
    return "";
  }
}

/**
 * Ask the model whether this user message is an image request.
 */
export async function isImageRequest(message: string): Promise<boolean> {
  const user_id = getUserId();
  const classifierPrompt =
    `You are a classifier. Answer ONLY 'yes' or 'no'.\n` +
    `Is the following user message asking to generate an image?\n"${message}"\nAnswer:`;
  try {
    const res = await fetch(
      "https://daydreamforge.onrender.com/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: classifierPrompt, user_id }),
      }
    );
    const data = (await res.json()) as ChatResponse;
    const answer = data.response?.trim() ?? "";
    return /^yes/i.test(answer);
  } catch (err) {
    console.error("isImageRequest failed:", err);
    return false;
  }
}
