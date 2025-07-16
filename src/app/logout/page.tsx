"use client";

import { useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function logout() {
      try {
        // ✅ Call backend logout to clear the HttpOnly cookie
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "https://www.daydreamforge.com"}/auth/logout`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!res.ok) {
          console.error("Logout backend request failed:", res.status);
        }
      } catch (err) {
        console.error("Logout fetch error:", err);
      }

      // ✅ Remove frontend cookies
      Cookies.remove("user_id");
      Cookies.remove("user_name");
      Cookies.remove("user_email");
      Cookies.remove("user_avatar");

      localStorage.clear();
      sessionStorage.clear();

      router.push("/");
    }

    logout();
  }, [router]);

  return (
    <div
      style={{
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "1.2rem",
      }}
    >
      Logging out...
    </div>
  );
}
