export async function sendMessageToBackend(message: string): Promise<string> {
    try {
      const response = await fetch("https://daydreamforge.onrender.com/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
  
      const data = await response.json();
      return data.response || "[No response]";
    } catch (error) {
      console.error("API error:", error);
      return "[Error connecting to backend]";
    }
  }
  