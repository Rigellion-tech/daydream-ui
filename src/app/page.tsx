"use client";

import { useState, useRef, useEffect } from "react";
import { sendMessageToBackend } from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<JSX.Element[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const user_id = useRef(
    localStorage.getItem("user_id") || `user-${Math.random().toString(36).substring(2, 10)}`
  ).current;

  useEffect(() => {
    localStorage.setItem("user_id", user_id);
  }, [user_id]);

  useEffect(() => {
    const fetchMemory = async () => {
      const res = await fetch(`https://daydreamforge.onrender.com/memory?user_id=${user_id}`);
      const data = await res.json();
      if (data.messages) {
        const restored = data.messages.map((msg: string, i: number) => (
          <div
            key={i}
            className={`self-${msg.startsWith("🧑") ? "end" : "start"} p-2 rounded-lg max-w-[80%] ${msg.startsWith("🧑") ? "bg-blue-100 dark:bg-blue-800" : "bg-gray-200 dark:bg-gray-700"} text-black dark:text-white`}
          >
            {msg}
          </div>
        ));
        setMessages(restored);
      }
    };
    fetchMemory();
  }, [user_id]);

  useEffect(() => {
    const saveMemory = async () => {
      const plainMessages = messages.map((msg) =>
        typeof msg === "string" ? msg : msg.props?.children?.[1] || msg.props?.children || ""
      );
      await fetch("https://daydreamforge.onrender.com/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, messages: plainMessages }),
      });
    };
    if (messages.length > 0) saveMemory();
  }, [messages, user_id]);

  const simulateTyping = async (text: string) => {
    const typingSpeed = 30;
    let current = "";
    for (let i = 0; i <= text.length; i++) {
      current = text.slice(0, i);
      setMessages((prev) => {
        const last = prev.slice(0, -1);
        return [
          ...last,
          <div key={prev.length} className="self-start bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
            🤖: {current}
          </div>,
        ];
      });
      await new Promise((res) => setTimeout(res, typingSpeed));
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setMessages((prev) => [
      ...prev,
      <div key={prev.length} className="self-end bg-blue-100 dark:bg-blue-800 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
        🧑: {userMessage}
      </div>,
    ]);
    setInput("");

    setMessages((prev) => [
      ...prev,
      <div key={prev.length} className="self-start text-gray-500 italic">🤖 is typing...</div>,
    ]);

    const response = await sendMessageToBackend(userMessage);
    await simulateTyping(response);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessages((prev) => [
      ...prev,
      <div key={prev.length} className="self-end bg-blue-100 dark:bg-blue-800 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
        🧑: [Uploaded an image]
      </div>,
    ]);
    const imageUrl = await uploadImageToCloudinary(file);

    if (imageUrl) {
      setMessages((prev) => [
        ...prev,
        <div key={prev.length} className="self-start bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
          🤖: Got your image. Generating transformation...
        </div>,
      ]);

      const result = await fetch("https://daydreamforge.onrender.com/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Create a dream version of this person.",
          identity_image_url: imageUrl,
        }),
      });

      const data = await result.json();
      if (data.image_url) {
        setMessages((prev) => [
          ...prev,
          <div key={prev.length} className="self-start space-y-2">
            <p className="bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
              🤖: ✅ {"Here's"} your transformation:
            </p>
            <img
              src={data.image_url}
              alt="Generated"
              className="max-w-full rounded-lg border border-gray-300 dark:border-gray-700"
            />
          </div>,
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          <div key={prev.length} className="self-start bg-red-200 dark:bg-red-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
            🤖: ❌ Image generation failed.
          </div>,
        ]);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        <div key={prev.length} className="self-start bg-red-200 dark:bg-red-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
          🤖: ❌ Failed to upload image.
        </div>,
      ]);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    fetch("https://daydreamforge.onrender.com/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, messages: [] }),
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 sm:p-10 bg-white dark:bg-black text-black dark:text-white">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8">💬 DayDream AI Assistant</h1>

      <div className="w-full max-w-2xl space-y-6">
        <div className="flex justify-between items-center">
          <button
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            onClick={handleClearChat}
          >
            Clear Chat 🗑️
          </button>
        </div>

        <div ref={messageListRef} className="flex flex-col gap-3 border p-4 rounded h-[500px] overflow-y-auto bg-gray-100 dark:bg-zinc-900">
          {messages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="flex-1 px-4 py-2 border rounded dark:bg-zinc-800"
            placeholder="Ask something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleSend}
          >
            Send
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-300 text-black rounded dark:bg-zinc-700 dark:text-white hover:bg-gray-400 dark:hover:bg-zinc-600"
          >
            📎
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
            accept="image/*"
          />
        </div>
      </div>
    </div>
  );
}
