"use client";

import { useState, useRef, useEffect } from "react";
import generateImage, { sendMessageToBackend } from "@/lib/api";  // default + named
import React, { ReactElement } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<(string | ReactElement)[]>([]);
  const [useHighQuality, setUseHighQuality] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const user_id = useRef(
    typeof window !== "undefined"
      ? localStorage.getItem("user_id") ||
        `user-${Math.random().toString(36).substring(2, 10)}`
      : "user-temp"
  ).current;

  useEffect(() => {
    localStorage.setItem("user_id", user_id);
  }, [user_id]);

  useEffect(() => {
    const fetchMemory = async () => {
      const res = await fetch(
        `https://daydreamforge.onrender.com/memory?user_id=${user_id}`
      );
      const data = await res.json();
      if (data.messages) {
        const restored = data.messages.map((msg: string, i: number) => (
          <div
            key={i}
            className={`self-${
              msg.startsWith("🧑") ? "end" : "start"
            } p-2 rounded-lg max-w-[80%] ${
              msg.startsWith("🧑")
                ? "bg-blue-100 dark:bg-blue-800"
                : "bg-gray-200 dark:bg-gray-700"
            } text-black dark:text-white`}
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
      const plainMessages = messages.map((msg) => {
        if (typeof msg === "string") return msg;
        if (React.isValidElement(msg)) {
          // typed as React.ReactNode instead of `any`
          const children = (msg as ReactElement<{ children: React.ReactNode }>).props
            .children;
          if (Array.isArray(children)) return children[1] || "";
          return typeof children === "string" ? children : "";
        }
        return "";
      });

      await fetch("https://daydreamforge.onrender.com/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, messages: plainMessages }),
      });
    };

    if (messages.length > 0) {
      saveMemory().catch((err) =>
        console.error("Failed to save memory:", err)
      );
    }
  }, [messages, user_id]);

  const simulateTyping = async (text: string) => {
    const typingSpeed = 30;
    for (let i = 0; i <= text.length; i++) {
      const current = text.slice(0, i);
      setMessages((prev) => {
        const last = prev.slice(0, -1);
        return [
          ...last,
          <div
            key={prev.length}
            className="self-start bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]"
          >
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
      <div
        key={prev.length}
        className="self-end bg-blue-100 dark:bg-blue-800 text-black dark:text-white p-2 rounded-lg max-w-[80%]"
      >
        🧑: {userMessage}
      </div>,
    ]);
    setInput("");

    setMessages((prev) => [
      ...prev,
      <div
        key={prev.length}
        className="self-start text-gray-500 italic"
      >
        🤖 is typing...
      </div>,
    ]);

    if (/\b(generate|draw|imagine|picture|render|image)\b/i.test(userMessage)) {
      const imageUrl = await generateImage(userMessage, useHighQuality);
      if (imageUrl) {
        setMessages((prev) => [
          ...prev,
          <div key={prev.length} className="self-start space-y-2">
            <p className="bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
              ✅ Here's your dream image:
            </p>
            <img
              src={imageUrl}
              alt="AI Generated"
              className="max-w-full rounded-lg border border-gray-300 dark:border-gray-700"
            />
          </div>,
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          <div
            key={prev.length}
            className="self-start bg-red-200 dark:bg-red-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]"
          >
            🤖: ❌ Image generation failed.
          </div>,
        ]);
      }
    } else {
      const response = await sendMessageToBackend(userMessage);
      await simulateTyping(response);
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
      <h1 className="text-3xl sm:text-4xl font-bold mb-8">
        💬 DayDream AI Assistant
      </h1>

      <div className="w-full max-w-2xl space-y-6">
        <div className="flex justify-between items-center">
          <button
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            onClick={handleClearChat}
          >
            Clear Chat 🗑️
          </button>
          <label className="text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              className="mr-1"
              checked={useHighQuality}
              onChange={() => setUseHighQuality((v) => !v)}
            />
            High Quality (Segmind)
          </label>
        </div>

        <div
          ref={messageListRef}
          className="flex flex-col gap-3 border p-4 rounded h-[500px] overflow-y-auto bg-gray-100 dark:bg-zinc-900"
        >
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
            onChange={() => {}}
            className="hidden"
            accept="image/*"
          />
        </div>
      </div>
    </div>
  );
}
