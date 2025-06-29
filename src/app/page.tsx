"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { generateImage, streamChat } from "@/lib/api";
import React, { ReactElement } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<(string | ReactElement)[]>([]);
  const [useHighQuality, setUseHighQuality] = useState(false);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const user_id = useRef(
    typeof window !== "undefined"
      ? localStorage.getItem("user_id") ||
        `user-${Math.random().toString(36).substring(2, 10)}`
      : "user-temp"
  ).current;

  // Persist user_id
  useEffect(() => {
    localStorage.setItem("user_id", user_id);
  }, [user_id]);

  // Fetch saved memory
  useEffect(() => {
    (async () => {
      const res = await fetch(
        `https://daydreamforge.onrender.com/memory?user_id=${user_id}`
      );
      const data = await res.json();
      if (data.messages) {
        const restored = data.messages.map((msg: string, i: number) => (
          <div
            key={i}
            className={`self-${msg.startsWith("🧑") ? "end" : "start"} p-2 rounded-lg max-w-[80%] ${
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
    })();
  }, [user_id]);

  // Save memory on change
  useEffect(() => {
    if (!messages.length) return;
    (async () => {
      const plain = messages.map((msg) => {
        if (typeof msg === "string") return msg;
        if (React.isValidElement(msg)) {
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
        body: JSON.stringify({ user_id, messages: plain }),
      });
    })().catch(console.error);
  }, [messages, user_id]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = messageListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Handle sending messages
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);

    // Add user bubble
    setMessages((prev) => [
      ...prev,
      <div
        key={prev.length}
        className="self-end bg-blue-100 dark:bg-blue-800 text-black dark:text-white p-2 rounded-lg max-w-[80%]"
      >
        🧑: {input}
      </div>,
    ]);

    // Determine if it's an image request
    if (/(generate|draw|imagine|picture|render|image)/i.test(input)) {
      const url = await generateImage(input, useHighQuality);
      setMessages((prev) => [
        ...prev,
        <div key={prev.length} className="self-start space-y-2">
          <p className="bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
            ✅ Here&apos;s your dream image:
          </p>
          <Image
            src={url}
            alt="AI Generated"
            width={512}
            height={512}
            className="rounded-lg border border-gray-300 dark:border-gray-700"
          />
        </div>,
      ]);
      setLoading(false);
    } else {
      // Add initial empty bot bubble
      setMessages((prev) => [
        ...prev,
        <div
          key={prev.length}
          className="self-start bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]"
        >
          🤖:
        </div>,
      ]);

      // Stream chat tokens with accumulation
      let accumulated = "";
      streamChat(
        input,
        (delta) => {
          accumulated += delta;
          setMessages((prev) => {
            const msgs = [...prev];
            const idx = msgs.length - 1;
            msgs[idx] = (
              <div
                key={idx}
                className="self-start bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]"
              >
                🤖: {accumulated}
              </div>
            );
            return msgs;
          });
        },
        () => setLoading(false),
        (err) => {
          setLoading(false);
          setMessages((prev) => [
            ...prev,
            <div key={prev.length} className="self-start text-red-500">
              Error: {err}
            </div>,
          ]);
        }
      );
    }

    setInput("");
  };

  // Handle file uploads
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;
    setLoading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "YOUR_UPLOAD_PRESET");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: form }
    );
    const { secure_url } = await res.json();

    // user image bubble
    setMessages((prev) => [
      ...prev,
      <div key={prev.length} className="self-end space-y-1">
        <p className="bg-blue-100 dark:bg-blue-800 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
          🧑 sent an image:
        </p>
        <Image
          src={secure_url}
          alt="User upload"
          width={256}
          height={256}
          className="rounded-lg border border-gray-300 dark:border-gray-700"
        />
      </div>,
    ]);

    // start streaming a description request
    // initial empty bot bubble
    setMessages((prev) => [
      ...prev,
      <div key={prev.length} className="self-start bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
        🤖:
      </div>,
    ]);
    let accumulatedDesc = "";
    streamChat(
      `Describe this image: ${secure_url}`,
      (delta) => {
        accumulatedDesc += delta;
        setMessages((prev) => {
          const msgs = [...prev];
          const idx = msgs.length - 1;
          msgs[idx] = (
            <div key={idx} className="self-start bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
              🤖: {accumulatedDesc}
            </div>
          );
          return msgs;
        });
      },
      () => setLoading(false),
      (err) => {
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          <div key={prev.length} className="self-start text-red-500">
            Error: {err}
          </div>,
        ]);
      }
    );

    e.target.value = "";
  };

  // Clear chat
  const handleClear = () => {
    setMessages([]);
    fetch("https://daydreamforge.onrender.com/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, messages: [] }),
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 sm:p-10 bg-white dark:bg-black text-black dark:text-white">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 flex items-center gap-2">
        <span>💬</span> DayDream AI Assistant
      </h1>
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex justify-between items-center">
          <button
            onClick={handleClear}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            Clear Chat 🗑️
          </button>
          <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
            <input
              type="checkbox"
              checked={useHighQuality}
              onChange={() => setUseHighQuality((v) => !v)}
            />
            High Quality (Segmind)
          </label>
        </div>
        <div
          ref={messageListRef}
          className="flex flex-col gap-3 border p-4 rounded h-[500px] overflow-y-auto bg-gray-100 dark:bg-zinc-900"
          aria-live="polite"
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
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className={`px-4 py-2 rounded text-white ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Sending…" : "Send"}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 text-black rounded dark:bg-zinc-700 dark:text-white hover:bg-gray-400 dark:hover:bg-zinc-600"
          >
            📎
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFile}
            className="hidden"
            accept="image/*"
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
