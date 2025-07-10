"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Head from "next/head";
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

  const user_id = useRef<string | null>(null);

  // ✅ PATCH: Read user_id from cookie
  useEffect(() => {
    const match = document.cookie.match(/user_id=([^;]+)/);
    if (match) {
      user_id.current = match[1];
    }
  }, []);

  const renderMessage = useCallback(
    (msg: ChatMessage, key: number) => {
      const baseClasses =
        "whitespace-pre-wrap p-4 rounded-2xl shadow-md max-w-[80%] transition duration-300 ease-in-out transform hover:scale-[1.02]";

      const userClasses =
        "self-end bg-gradient-to-r from-cyan-400 to-cyan-600 text-black font-bold";
      const assistantClasses =
        "self-start bg-black text-yellow-300 border-2 border-yellow-400";

      return (
        <div
          key={key}
          className={`w-full flex ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`${baseClasses} ${
              msg.role === "user" ? userClasses : assistantClasses
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
    if (!user_id.current) return;

    (async () => {
      const res = await fetch(
        `https://daydreamforge.onrender.com/memory?user_id=${user_id.current}`
      );
      const data = await res.json();
      if (data.messages) {
        const raw: ChatMessage[] = data.messages;
        const restored = raw.map((msg, i) => renderMessage(msg, i));
        setMessages(restored);
        setRawMessages(raw);
      }
    })();
  }, [user_id.current, renderMessage]);

  useEffect(() => {
    if (!rawMessages.length || !user_id.current) return;
    (async () => {
      await fetch("https://daydreamforge.onrender.com/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user_id.current, messages: rawMessages }),
      });
    })().catch(console.error);
  }, [rawMessages, user_id.current]);

  useEffect(() => {
    const el = messageListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function forceParagraphs(text: string) {
    return text
      .replace(/([.?!])([^\d.])/g, "$1 $2")
      .replace(/([.?!])\s+(?=[A-Z])/g, "$1\n\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  const addTypingBubble = () => {
    const typingBubble = (
      <div
        key={`typing-${messages.length}`}
        className="w-full flex justify-start animate-pulse"
      >
        <div className="self-start bg-cyan-500 text-black p-3 rounded-2xl max-w-[80%] shadow-md">
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
    if (!user_id.current) return;

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
      removeTypingBubble();
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
          className="rounded-xl border-4 border-yellow-300 shadow-lg"
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
        removeTypingBubble();
        setRawMessages((prev) => [...prev, assistantMsg]);
        setMessages((prev) => [
          ...prev,
          renderMessage(assistantMsg, prev.length),
        ]);
      } catch (err) {
        console.error("Chat API error:", err);
        removeTypingBubble();
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
    if (!file || loading || !user_id.current) return;
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
          className="rounded-xl border-4 border-yellow-300 shadow-lg"
        />,
      ]);

      addTypingBubble();

      try {
        const reply = await sendMessageToBackend("", secure_url);
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: reply,
        };
        removeTypingBubble();
        setRawMessages((prev) => [...prev, assistantMsg]);
        setMessages((prev) => [
          ...prev,
          renderMessage(assistantMsg, prev.length),
        ]);
      } catch (err) {
        console.error("Chat API error:", err);
        removeTypingBubble();
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
    if (!user_id.current) return;
    fetch("https://daydreamforge.onrender.com/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user_id.current, messages: [] }),
    }).catch(console.error);
  };

  return (
    <>
      <Head>
        <title>DayDreamForge</title>
        <meta
          name="description"
          content="DayDreamForge — your AI-powered transformation coach."
        />
      </Head>
      <div className="flex flex-col items-center justify-center min-h-screen p-6 sm:p-10 bg-gradient-to-br from-black via-gray-900 to-black text-yellow-300 font-bold">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 flex items-center gap-2 text-cyan-400 drop-shadow-md">
          <span>💬</span> DayDream AI Assistant
        </h1>
        <div className="flex justify-between items-center w-full max-w-2xl mb-4">
          <button
            onClick={handleClear}
            className="px-3 py-1 bg-yellow-400 text-black font-bold rounded hover:bg-yellow-500 text-sm transition duration-300"
          >
            Clear Chat 🗑️
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-300">
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
          className="flex flex-col gap-4 border border-yellow-400 p-4 rounded-2xl h-[500px] overflow-y-auto bg-black bg-opacity-50 w-full max-w-2xl"
          aria-live="polite"
        >
          {messages.map((msg, i) => (
            <React.Fragment key={i}>{msg}</React.Fragment>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full max-w-2xl mt-4">
          <input
            type="text"
            className="flex-1 px-4 py-2 border-2 border-yellow-400 rounded-2xl bg-black text-yellow-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Ask something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className={`px-4 py-2 rounded-2xl text-black font-bold transition duration-300 ${
              loading ? "bg-gray-400" : "bg-yellow-400 hover:bg-yellow-500"
            }`}
          >
            {loading ? "Sending…" : "Send"}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-4 py-2 bg-cyan-400 text-black rounded-2xl font-bold hover:bg-cyan-500 transition duration-300"
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
    </>
  );
}
