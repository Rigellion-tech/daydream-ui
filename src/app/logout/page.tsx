"use client";

import { useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://www.daydreamforge.com";

  useEffect(() => {
    async function logout() {
      try {
        const res = await fetch(`${apiBase}/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          }
        });

        if (!res.ok) {
          console.warn(`Logout failed with status: ${res.status}`);
        } else {
          console.log("Logout successful.");
        }
      } catch (err) {
        console.error("Logout fetch error:", err);
      }

      // Clean up client storage and cookies
      ["user_id", "user_name", "user_email", "user_avatar"].forEach((key) =>
        Cookies.remove(key)
      );
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to login
      router.push("/");
    }

    logout();
  }, [apiBase, router]);

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
