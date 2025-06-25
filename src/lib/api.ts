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

    const res = await fetch(
      "https://daydreamforge.onrender.com/image", // ← make sure this matches your Flask route!
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, useHighQuality: highQuality, user_id }),
      }
    );

    console.log("🖼 /generate-image status:", res.status);
    const data = await res.json();
    console.log("🖼 /generate-image body:", data);

    if (data.imageUrl) return data.imageUrl;

    throw new Error(data.error || "no imageUrl in response");
  } catch (err: any) {
    console.error("🔥 generateImage error:", err);
    return "";
  }
}

