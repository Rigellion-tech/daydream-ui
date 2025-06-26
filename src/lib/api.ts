// src/lib/api.ts

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

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("💬 /chat JSON parse error:", parseErr);
      return "[Invalid JSON from chat]";
    }

    if (!res.ok) {
      console.error("💬 /chat non-OK response:", data);
      return `[Chat API error: ${data.error || res.status}]`;
    }

    return data.response || "[No response]";
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("💬 sendMessageToBackend error:", err.message);
    } else {
      console.error("💬 sendMessageToBackend non-Error:", err);
    }
    return "[Error connecting to backend]";
  }
}

/**
 * Call your Flask backend image-generation endpoint.
 *
 * @param prompt the text prompt to generate
 * @param highQuality whether to use the fallback high-quality Segmind route
 * @returns URL of the generated image (or empty string on failure)
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

    // Try to parse JSON
    let data: { imageUrl?: string; error?: string };
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      throw new Error("Invalid JSON from image endpoint");
    }

    if (!res.ok) {
      throw new Error(
        `Image API error (${res.status}): ${data.error || "no error message"}`
      );
    }

    if (data.imageUrl) {
      return data.imageUrl;
    } else {
      throw new Error(data.error || "no imageUrl in response");
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("🔥 generateImage error:", err.message);
    } else {
      console.error("🔥 generateImage error (non-Error):", err);
    }
    return "";
  }
}
