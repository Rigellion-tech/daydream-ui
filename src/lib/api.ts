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

/**
 * Stream chat completions from the backend using structured messages.
 * Calls onDelta for each token chunk, onDone when complete, onError on failures.
 */
export function streamChat(
  messages: ChatMessage[],
  imageUrl: string | undefined,
  onDelta: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): EventSourcePolyfill {
  const user_id = getUserId();

  const url = `https://daydreamforge.onrender.com/chat/stream`;

  const es = new EventSourcePolyfill(url, {
    headers: {
      "Content-Type": "application/json",
    },
    payload: JSON.stringify({
      user_id,
      image_url: imageUrl,
      messages,
    }),
    withCredentials: false,
  });

  es.onmessage = (e) => {
    if (e.data) onDelta(e.data);
  };

  es.addEventListener("done", () => {
    es.close();
    onDone();
  });

  es.onerror = () => {
    if (es.readyState !== EventSource.CLOSED) {
      onError("Network or CORS error");
      es.close();
    }
  };
  return es;
}

/**
 * Polyfill for EventSource that supports POST requests.
 * Replaces the native EventSource for POST-based streams.
 */
export class EventSourcePolyfill {
  private controller: AbortController;
  private onMessageHandler: ((event: MessageEvent) => void) | null = null;
  private onErrorHandler: (() => void) | null = null;
  private onDoneHandler: (() => void) | null = null;

  constructor(
    url: string,
    opts: {
      headers: Record<string, string>;
      payload: string;
      withCredentials: boolean;
    }
  ) {
    this.controller = new AbortController();
    this.init(url, opts);
  }

  private async init(
    url: string,
    opts: {
      headers: Record<string, string>;
      payload: string;
      withCredentials: boolean;
    }
  ) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: opts.headers,
        body: opts.payload,
        signal: this.controller.signal,
      });

      if (!res.body) {
        this.onErrorHandler?.();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith("data:")) {
            const data = line.slice("data:".length).trim();
            this.onMessageHandler?.(
              new MessageEvent("message", { data })
            );
          } else if (line.startsWith("event: done")) {
            this.onDoneHandler?.();
          }
        }
      }
      this.onDoneHandler?.();
    } catch (e) {
      console.error(e);
      this.onErrorHandler?.();
    }
  }

  close() {
    this.controller.abort();
  }

  set onmessage(handler: ((event: MessageEvent) => void) | null) {
    this.onMessageHandler = handler;
  }

  set onerror(handler: (() => void) | null) {
    this.onErrorHandler = handler;
  }

  addEventListener(event: string, handler: () => void) {
    if (event === "done") {
      this.onDoneHandler = handler;
    }
  }

  get readyState() {
    return 1;
  }
}
