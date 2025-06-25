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

    const response = await fetch(
      "https://daydreamforge.onrender.com/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, user_id }),
      }
    );

    const data = await response.json();
    return data.response || "[No response]";
  } catch (error) {
    console.error("API error:", error);
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

    const response = await fetch(
      "https://daydreamforge.onrender.com/image", // ← adjust path if your backend uses /generate or /generate-image
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, useHighQuality: highQuality, user_id }),
      }
    );

    interface ImageResponse { imageUrl?: string; error?: string; }

    const data: ImageResponse = await response.json();
    if (data.imageUrl) return data.imageUrl;

    console.error("Image API error:", data.error || "no URL returned");
    return "";
  } catch (err) {
    console.error("GenerateImage error:", err);
    return "";
  }
}
