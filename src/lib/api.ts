// src/lib/api.ts

import Cookies from "js-cookie";

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

// ✅ Grab base API URL from env
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://www.daydreamforge.com";

// --- Improved: Sync cookie/localStorage for user_id ---
export function getUserId(): string {
  if (typeof window === "undefined") return "user-temp";

  const cookieId = Cookies.get("user_id");
  if (cookieId) return cookieId;

  const localId = localStorage.getItem("user_id");
  if (localId) return localId;

  const newId = `user-${Math.random().toString(36).substring(2, 10)}`;
  localStorage.setItem("user_id", newId);
  return newId;
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

  console.log("Sending chat payload:", payload); // 🪵 Debug

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    let data: ChatResponse;
    try {
      data = await res.json();
    } catch (err) {
      console.error("Failed to parse JSON from /chat:", err);
      return "Failed to parse response.";
    }

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
  const payload = {
    prompt,
    useHighQuality: highQuality,
    user_id,
  };

  console.log("Sending image payload:", payload); // 🪵 Debug

  try {
    const res = await fetch(`${API_BASE}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    let data: ImageResponse;
    try {
      data = await res.json();
    } catch (err) {
      console.error("Failed to parse JSON from /image:", err);
      return "";
    }

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

  const payload = { message: classifierPrompt, user_id };
  console.log("Sending isImageRequest payload:", payload); // 🪵 Debug

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    let data: ChatResponse;
    try {
      data = await res.json();
    } catch (err) {
      console.error("Failed to parse JSON from classifier:", err);
      return false;
    }

    const answer = data.response?.trim() ?? "";
    return /^yes/i.test(answer);
  } catch (err) {
    console.error("isImageRequest failed:", err);
    return false;
  }
}
