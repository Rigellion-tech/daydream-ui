"use client";
import { useState } from "react";
import { sendMessageToBackend } from "@/lib/api";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setMessages((prev) => [...prev, `🧑: ${userMessage}`]);
    setInput("");

    const response = await sendMessageToBackend(userMessage);
    setMessages((prev) => [...prev, `🤖: ${response}`]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-white dark:bg-black text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-6">💬 DayDream AI Assistant</h1>

      <div className="w-full max-w-xl space-y-4">
        <div className="border p-4 rounded h-96 overflow-y-auto bg-gray-100 dark:bg-zinc-900">
          {messages.map((msg, i) => (
            <p key={i} className="mb-2 whitespace-pre-line">{msg}</p>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-4 py-2 border rounded dark:bg-zinc-800"
            placeholder="Ask something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
