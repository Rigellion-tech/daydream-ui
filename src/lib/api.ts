// src/lib/api.ts

// --- Typed interfaces for API responses ---
interface ChatResponse {
  response?: string;
  error?: string;
}
interface ImageResponse {
  imageUrl?: string;
  error?: string;
}

// --- Helper to manage or generate a persistent user ID ---
function getUserId(): string {
  if (typeof window === 'undefined') return 'user-temp';
  let id = localStorage.getItem('user_id');
  if (!id) {
    id = `user-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('user_id', id);
  }
  return id;
}

/**
 * Send a single chat message to the backend and return the full reply.
 */
export async function sendMessageToBackend(
  message: string
): Promise<string> {
  const user_id = getUserId();
  try {
    const res = await fetch(
      'https://daydreamforge.onrender.com/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, user_id }),
      }
    );
    const data = (await res.json()) as ChatResponse;
    if (!res.ok || data.error) {
      console.error(`Chat API error: ${data.error || res.status}`);
      return data.error ?? '';
    }
    return data.response ?? '';
  } catch (err) {
    console.error('sendMessageToBackend failed:', err);
    return '';
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
      'https://daydreamforge.onrender.com/image',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, useHighQuality: highQuality, user_id }),
      }
    );
    const data = (await res.json()) as ImageResponse;
    if (!res.ok || data.error || !data.imageUrl) {
      console.error(`Image API error: ${data.error || res.status}`);
      return '';
    }
    return data.imageUrl;
  } catch (err) {
    console.error('generateImage failed:', err);
    return '';
  }
}

/**
 * Stream chat responses token-by-token in real time.
 * Calls onDelta() for each new text chunk, onDone() when complete, onError() on true failures.
 */
export function streamChat(
  message: string,
  onDelta: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): EventSource {
  const user_id = getUserId();
  const params = new URLSearchParams({ user_id, message });
  const url = `https://daydreamforge.onrender.com/chat/stream?${params.toString()}`;
  const es = new EventSource(url);

  // Token events
  es.onmessage = (e) => {
    if (e.data) onDelta(e.data);
  };

  // Custom 'done' event signals end of stream
  es.addEventListener('done', () => {
    es.close();
    onDone();
  });

  // Only treat actual network/CORS issues as errors
  es.onerror = () => {
    if (es.readyState !== EventSource.CLOSED) {
      onError('Network or CORS error');
      es.close();
    }
  };

  return es;
}
