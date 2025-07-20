"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Head from "next/head";
import NextImage from "next/image";
import Cookies from "js-cookie";
import Link from "next/link";
import React, { ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import { isImageRequest, ChatMessage } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ReactElement[]>([]);
  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);

  const [userName, setUserName] = useState<string>("User");
  const [userEmail, setUserEmail] = useState<string>("user@example.com");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>("/avatar.png");
  const [showMenu, setShowMenu] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true); // 👈 New

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const user_id = useRef<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://www.daydreamforge.com";

  useEffect(() => {
    const id = Cookies.get("user_id");

    if (!id) {
      router.push("/login");
      return;
    }

    user_id.current = id;
    const name = Cookies.get("user_name");
    const email = Cookies.get("user_email");
    const avatar = Cookies.get("user_avatar");

    if (name) setUserName(name);
    if (email) setUserEmail(email);
    setUserAvatarUrl(avatar || "/avatar.png");

    setCheckingAuth(false); // ✅ Done checking
  }, [router]);

  useEffect(() => {
    const handler = () => setShowMenu(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
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
        <div key={key} className={`w-full flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`${baseClasses} ${msg.role === "user" ? userClasses : assistantClasses}`}>
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
      const res = await fetch(`${apiBase}/memory?user_id=${user_id.current}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.messages) {
        const raw: ChatMessage[] = data.messages;
        const restored = raw.map((msg, i) => renderMessage(msg, i));
        setMessages(restored);
        setRawMessages(raw);
      }
    })();
  }, [renderMessage, apiBase]);

  useEffect(() => {
    if (!rawMessages.length || !user_id.current) return;
    (async () => {
      await fetch(`${apiBase}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: user_id.current, messages: rawMessages }),
      });
    })().catch(console.error);
  }, [rawMessages, apiBase]);

  useEffect(() => {
    const el = messageListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function forceParagraphs(text: string) {
    return text
      .replace(/([.?!])([^\n\d.])/g, "$1 $2")
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
      prev.filter(
        (msg) =>
          !(
            React.isValidElement(msg) &&
            typeof msg.key === "string" &&
            msg.key.startsWith("typing-")
          )
      )
    );
  };

  const sendMessageToBackendPatched = async (message: string, imageUrl?: string) => {
    if (!user_id.current) throw new Error("Missing user ID");

    const res = await fetch(`${apiBase}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        user_id: user_id.current,
        message,
        image_url: imageUrl,
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.response as string;
  };

  const generateImagePatched = async (prompt: string) => {
    if (!user_id.current) throw new Error("Missing user ID");

    const res = await fetch(`${apiBase}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        prompt,
        user_id: user_id.current,
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.imageUrl as string;
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
      const url = await generateImagePatched(promptText);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: "✅ Here's your dream image:",
      };
      removeTypingBubble();
      setRawMessages((prev) => [...prev, assistantMsg]);
      setMessages((prev) => [
        ...prev,
        renderMessage(assistantMsg, prev.length),
        <NextImage
          key={`img-${Date.now()}`}
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
        const fullReply = await sendMessageToBackendPatched(input, currentImageUrl);
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
        <NextImage
          key={`upload-${Date.now()}`}
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
        const reply = await sendMessageToBackendPatched("", secure_url);
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
    fetch(`${apiBase}/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ user_id: user_id.current, messages: [] }),
    }).catch(console.error);
  };

  if (checkingAuth) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-yellow-300">
        Loading...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>DayDreamForge</title>
        <meta
          name="description"
          content="DayDreamForge — your AI-powered transformation coach."
        />
      </Head>

      <div className="relative flex flex-col h-screen w-screen bg-black text-yellow-300 font-bold overflow-hidden">
        <header className="flex justify-between items-center px-4 py-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2 text-cyan-400">
            <span>💬</span> DayDream AI Assistant
          </h1>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((prev) => !prev);
              }}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-400 hover:scale-105 transition"
            >
              <NextImage
                src={userAvatarUrl}
                alt={userName}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            </button>

            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-black border border-yellow-400 z-50 text-yellow-300"
              >
                <div className="flex flex-col items-center p-4 border-b border-yellow-400">
                  <NextImage
                    src={userAvatarUrl}
                    alt={userName}
                    width={64}
                    height={64}
                    className="rounded-full border-2 border-yellow-400 mb-2 object-cover"
                  />
                  <p className="font-bold text-lg">Hi, {userName}!</p>
                  <p className="text-xs text-gray-400">{userEmail}</p>
                </div>
                <button
                  onClick={() => {
                    handleClear();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-yellow-700 border-b border-yellow-400"
                >
                  Clear Chat 🗑️
                </button>
                <Link
                  href="/logout"
                  className="block w-full text-left px-4 py-3 hover:bg-yellow-700"
                  onClick={() => setShowMenu(false)}
                >
                  Sign Out 🚪
                </Link>
              </div>
            )}
          </div>
        </header>

        <main className="flex flex-col flex-grow overflow-hidden">
          <div
            ref={messageListRef}
            className="flex flex-col gap-4 flex-grow overflow-y-auto p-4"
            aria-live="polite"
          >
            {messages.map((msg, i) => (
              <React.Fragment key={i}>{msg}</React.Fragment>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-center mt-4 px-4 pb-4">
            <input
              type="text"
              className="flex-1 px-4 py-3 border-2 border-yellow-400 rounded-2xl bg-black text-yellow-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Ask something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className={`px-4 py-3 rounded-2xl text-black font-bold transition duration-300 ${
                loading ? "bg-gray-400" : "bg-yellow-400 hover:bg-yellow-500"
              }`}
            >
              {loading ? "Sending…" : "Send"}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-4 py-3 bg-cyan-400 text-black rounded-2xl font-bold hover:bg-cyan-500 transition duration-300"
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
        </main>
      </div>
    </>
  );
}
