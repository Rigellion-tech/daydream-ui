"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RequestCodeResponse {
  status: string;
  error?: string;
}

interface VerifyCodeResponse {
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

  async function requestCode(email: string): Promise<RequestCodeResponse> {
    const res = await fetch(
      "https://daydreamforge.onrender.com/auth/request_code",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );

    const data: RequestCodeResponse = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to send code");
    }
    return data;
  }

  async function verifyCode(
    email: string,
    code: string
  ): Promise<VerifyCodeResponse> {
    const res = await fetch(
      "https://daydreamforge.onrender.com/auth/verify_code",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      }
    );

    const data: VerifyCodeResponse = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Verification failed");
    }

    // ✅ PATCH HERE: store user_id in cookie instead of localStorage
    document.cookie = `user_id=${data.user_id}; path=/; max-age=31536000; SameSite=Lax`;

    return data;
  }

  const handleSendCode = async () => {
    setLoading(true);
    setMessage("");
    try {
      await requestCode(email);
      setMessage("Check your email for the login code!");
      setStep("code");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred.";
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
      setMessage(`Logged in as ${res.user_id}`);
      router.push("/");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred.";
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
            <h2 className="text-2xl mb-4 text-cyan-400">
              Sign in to DayDream Forge
            </h2>
            <input
              type="email"
              placeholder="you@email.com"
              className="w-full p-3 rounded border border-cyan-500 bg-gray-900 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 rounded"
            >
              {loading ? "Sending..." : "Send Code"}
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <h2 className="text-2xl mb-4 text-yellow-400">
              Enter Your Code
            </h2>
            <input
              type="text"
              placeholder="6-digit code"
              className="w-full p-3 rounded border border-yellow-500 bg-gray-900 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </>
        )}

        {message && <p className="mt-4 text-red-400">{message}</p>}
      </div>
    </div>
  );
}
