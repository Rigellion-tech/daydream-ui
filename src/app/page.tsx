"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  generateImage,
  sendMessageToBackend,
  isImageRequest,
  ChatMessage,
} from "@/lib/api";
import React, { ReactElement } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ReactElement[]>([]);
  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);
  const [useHighQuality, setUseHighQuality] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(
    undefined
  );

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

  const renderMessage = useCallback(
    (msg: ChatMessage, key: number) => {
      return (
        <div
          key={key}
          className={`w-full flex ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`whitespace-pre-wrap p-2 rounded-lg max-w-[80%] ${
              msg.role === "user"
                ? "self-end bg-blue-100 dark:bg-blue-800 text-black dark:text-white"
                : "self-start bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
            }`}
          >
            {msg.role === "assistant" ? (
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{forceParagraphs(msg.content || "")}</ReactMarkdown>
              </div>
            ) : (
              `🧑: ${msg.content}`
            )}
          </div>
        </div>
      );
    },
    []
  );

  useEffect(() => {
    (async () => {
      const res = await fetch(
        `https://daydreamforge.onrender.com/memory?user_id=${user_id}`
      );
      const data = await res.json();
      if (data.messages) {
        const raw: ChatMessage[] = data.messages;
        const restored = raw.map((msg, i) => renderMessage(msg, i));
        setMessages(restored);
        setRawMessages(raw);
      }
    })();
  }, [user_id, renderMessage]);

  useEffect(() => {
    if (!rawMessages.length) return;
    (async () => {
      await fetch("https://daydreamforge.onrender.com/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, messages: rawMessages }),
      });
    })().catch(console.error);
  }, [rawMessages, user_id]);

  useEffect(() => {
    const el = messageListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function forceParagraphs(text: string) {
    return text
      .replace(/([.?!])(\S)/g, "$1 $2")
      .replace(/([.?!])\s+/g, "$1\n\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  const addTypingBubble = () => {
    const typingBubble = (
      <div
        key={`typing-${messages.length}`}
        className="w-full flex justify-start animate-pulse"
      >
        <div className="self-start bg-gray-200 dark:bg-gray-700 text-black dark:text-white p-2 rounded-lg max-w-[80%]">
          <span>🤖:</span> <span className="ml-2">Typing...</span>
        </div>
      </div>
    );
    setMessages((prev) => [...prev, typingBubble]);
  };

  const removeTypingBubble = () => {
    setMessages((prev) =>
      prev.filter((msg) => {
        return !(
          React.isValidElement(msg) &&
          typeof msg.key === "string" &&
          msg.key.startsWith("typing-")
        );
      })
    );
  };

  const handleSend = async () => {
    if ((!input.trim() && !currentImageUrl) || loading) return;
    setLoading(true);

    const userMsg: ChatMessage = { role: "user", content: input };
    setRawMessages((prev) => [...prev, userMsg]);
    setMessages((prev) => [...prev, renderMessage(userMsg, prev.length)]);

    addTypingBubble();

    const wantsImage = await isImageRequest(input);
    if (wantsImage) {
      const promptText = input.trim().replace(/^\/image\s+/i, "");
      const url = await generateImage(promptText, useHighQuality);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: "✅ Here's your dream image:",
      };
      removeTypingBubble(); // ✅ PATCH
      setRawMessages((prev) => [...prev, assistantMsg]);
      setMessages((prev) => [
        ...prev,
        renderMessage(assistantMsg, prev.length),
        <Image
          key={`img-${prev.length}`}
          unoptimized
          src={url}
          alt="AI Generated"
          width={512}
          height={512}
          className="rounded-lg border border-gray-300 dark:border-gray-700"
        />,
      ]);
      setLoading(false);
    } else {
      try {
        const fullReply = await sendMessageToBackend(input, currentImageUrl);
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: fullReply,
        };
        removeTypingBubble(); // ✅ PATCH
        setRawMessages((prev) => [...prev, assistantMsg]);
        setMessages((prev) => [
          ...prev,
          renderMessage(assistantMsg, prev.length),
        ]);
      } catch (err) {
        console.error("Chat API error:", err);
        removeTypingBubble(); // ✅ PATCH
        setMessages((prev) => [
          ...prev,
          <div key={prev.length} className="w-full flex justify-start">
            <div className="self-start text-red-500">
              Error: {String(err)}
            </div>
          </div>,
        ]);
      }
      setLoading(false);
    }

    setInput("");
    setCurrentImageUrl(undefined);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;
    setLoading(true);

    const form = new FormData();
    form.append("file", file);
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET!;
    const folder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER;
    form.append("upload_preset", preset);
    if (folder) form.append("folder", folder);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: form }
      );
      const data = await res.json();
      if (!data.secure_url) {
        console.error("Cloudinary upload failed:", data);
        setLoading(false);
        return;
      }
      const secure_url = data.secure_url;
      setCurrentImageUrl(secure_url);

      const userMsg: ChatMessage = {
        role: "user",
        content: `[sent image: ${secure_url}]`,
      };

      setRawMessages((prev) => [...prev, userMsg]);
      setMessages((prev) => [
        ...prev,
        renderMessage(userMsg, prev.length),
        <Image
          key={`upload-${prev.length}`}
          unoptimized
          src={secure_url}
          alt="User upload"
          width={256}
          height={256}
          className="rounded-lg border border-gray-300 dark:border-gray-700"
        />,
      ]);

      addTypingBubble();

      try {
        const reply = await sendMessageToBackend("", secure_url);
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: reply,
        };
        removeTypingBubble(); // ✅ PATCH
        setRawMessages((prev) => [...prev, assistantMsg]);
        setMessages((prev) => [
          ...prev,
          renderMessage(assistantMsg, prev.length),
        ]);
      } catch (err) {
        console.error("Chat API error:", err);
        removeTypingBubble(); // ✅ PATCH
        setMessages((prev) => [
          ...prev,
          <div key={prev.length} className="w-full flex justify-start">
            <div className="self-start text-red-500">
              Error: {String(err)}
            </div>
          </div>,
        ]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setLoading(false);
    }

    e.target.value = "";
    setLoading(false);
  };

  const handleClear = () => {
    setMessages([]);
    setRawMessages([]);
    fetch("https://daydreamforge.onrender.com/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, messages: [] }),
    }).catch(console.error);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 sm:p-10 bg-white dark:bg-black text-black dark:text-white">
      <h1 className="text-3xl sm:text-4xl font-bold mb-4 flex items-center gap-2">
        <span>💬</span> DayDream AI Assistant
      </h1>
      <div className="flex justify-between items-center w-full max-w-2xl mb-4">
        <button
          onClick={handleClear}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          Clear Chat 🗑️
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={useHighQuality}
            onChange={() => setUseHighQuality((v) => !v)}
            className="h-4 w-4"
          />
          High Quality (Segmind)
        </label>
      </div>
      <div
        ref={messageListRef}
        className="flex flex-col gap-3 border p-4 rounded h-[500px] overflow-y-auto bg-gray-100 dark:bg-zinc-900 w-full max-w-2xl"
        aria-live="polite"
      >
        {messages.map((msg, i) => (
          <React.Fragment key={i}>{msg}</React.Fragment>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 items-center w-full max-w-2xl">
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
  );
}
