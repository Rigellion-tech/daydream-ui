"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    Cookies.remove("user_id");
    localStorage.removeItem("user_id");
    // Optionally: clear other user-related cookies
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-yellow-400">
      <div className="text-xl">Signing out…</div>
    </div>
  );
}
