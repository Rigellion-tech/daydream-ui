"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

interface RequestCodeResponse {
  success?: boolean;
  error?: string;
}

interface VerifyCodeResponse {
  success: boolean;
  user_id: string;
  error?: string;
}

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://www.daydreamforge.com";

  // ─── Ensure user_id fallback ─────────────────────────────
  useEffect(() => {
    const existing = localStorage.getItem("user_id");
    if (!existing) {
      const generated = `user-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("user_id", generated);
      console.info("Generated user_id:", generated);
    } else {
      console.info("Detected user_id:", existing);
    }
  }, []);

  // ─── Robust JSON fetcher ────────────────────────────────
  async function safeJsonParse(res: Response) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.warn("Non-JSON response received:", text);
      return {};
    }
  }

  async function requestCode(email: string): Promise<RequestCodeResponse> {
    try {
      const res = await fetch(`${apiBase}/auth/request_code`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data: RequestCodeResponse = await safeJsonParse(res);
      if (!res.ok) throw new Error(data.error || "Failed to send code.");
      return data;
    } catch (error) {
      console.error("Request code failed:", error);
      throw new Error("Failed to fetch. Please check your connection.");
    }
  }

  async function verifyCode(email: string, code: string): Promise<VerifyCodeResponse> {
    try {
      const res = await fetch(`${apiBase}/auth/verify_code`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data: VerifyCodeResponse = await safeJsonParse(res);
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      return data;
    } catch (error) {
      console.error("Verify code failed:", error);
      throw new Error("Failed to fetch. Please check your connection.");
    }
  }

  const handleSendCode = async () => {
    setLoading(true);
    setMessage("");
    try {
      await requestCode(email);
      setMessage("Check your email for the login code!");
      setStep("code");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred.";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await verifyCode(email, code);
      Cookies.set("user_id", res.user_id, { path: "/" });
      localStorage.setItem("user_id", res.user_id);
      setMessage(`Logged in as ${res.user_id}`);
      router.push("/chat");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred.";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-lg p-6">
        {step === "email" && (
          <>
            <h2 className="text-3xl mb-4 text-cyan-400 font-extrabold">Sign in to DayDream Forge</h2>
            <input
              type="email"
              placeholder="you@email.com"
              className="w-full p-3 rounded border border-cyan-500 bg-gray-900 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={handleSendCode}
              disabled={loading || !email}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 rounded"
            >
              {loading ? "Sending..." : "Send Code"}
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <h2 className="text-3xl mb-4 text-yellow-400 font-extrabold">Enter Your Code</h2>
            <input
              type="text"
              placeholder="6-digit code"
              className="w-full p-3 rounded border border-yellow-500 bg-gray-900 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              onClick={handleVerify}
              disabled={loading || !code}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              onClick={() => setStep("email")}
              className="mt-4 w-full text-sm text-cyan-400 hover:underline"
            >
              ← Back to email
            </button>
          </>
        )}

        {message && (
          <p className="mt-4 text-red-400 text-center whitespace-pre-wrap">{message}</p>
        )}
      </div>
    </div>
  );
}
