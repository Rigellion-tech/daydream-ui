// src/lib/api.ts

// 1) Give your responses a real interface instead of `any`
interface ChatResponse {
  response?: string;
  error?: string;
}

interface ImageResponse {
  imageUrl?: string;
  error?: string;
}

/**
 * Call your Flask backend chat endpoint.
 */
export async function sendMessageToBackend(message: string): Promise<string> {
  try {
    const user_id = 
      typeof window !== "undefined"
        ? localStorage.getItem("user_id") || "user-temp"
        : "user-temp";

    const res = await fetch("https://daydreamforge.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, user_id }),
    });

    console.log("💬 /chat status:", res.status, res.statusText);
    const text = await res.text();
    console.log("💬 /chat raw response:", text);

    // 2) Parse into a typed interface
    let data: ChatResponse;
    try {
      data = JSON.parse(text) as ChatResponse;
    } catch (error: unknown) {
      console.error("💬 /chat JSON parse error:", error);
      return "[Invalid JSON from chat]";
    }

    if (!res.ok) {
      console.error("💬 /chat error:", data.error || res.status);
      return `[Chat API error: ${data.error || res.status}]`;
    }

    return data.response ?? "[No response]";
  } catch (err: unknown) {
    console.error(
      "💬 sendMessageToBackend error:",
      err instanceof Error ? err.message : err
    );
    return "[Error connecting to backend]";
  }
}

/**
 * Call your Flask backend image-generation endpoint.
 */
export default async function generateImage(
  prompt: string,
  highQuality = false
): Promise<string> {
  try {
    const user_id =
      typeof window !== "undefined"
        ? localStorage.getItem("user_id") || "user-temp"
        : "user-temp";

    const res = await fetch("https://daydreamforge.onrender.com/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, useHighQuality: highQuality, user_id }),
    });

    console.log("🖼 /image status:", res.status, res.statusText);
    const text = await res.text();
    console.log("🖼 /image raw response:", text);

    let data: ImageResponse;
    try {
      data = JSON.parse(text) as ImageResponse;
    } catch (error: unknown) {
      throw new Error("Invalid JSON from image endpoint");
    }

    if (!res.ok) {
      throw new Error(
        `Image API error (${res.status}): ${data.error || "no error message"}`
      );
    }

    if (!data.imageUrl) {
      throw new Error(data.error || "no imageUrl in response");
    }

    return data.imageUrl;
  } catch (err: unknown) {
    console.error(
      "🔥 generateImage error:",
      err instanceof Error ? err.message : err
    );
    return "";
  }
}
