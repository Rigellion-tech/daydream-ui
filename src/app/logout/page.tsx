"use client";

import { useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // ✅ PATCH: Remove all user-related cookies
    Cookies.remove("user_id");
    Cookies.remove("user_name");
    Cookies.remove("user_email");
    Cookies.remove("user_avatar");

    // Optionally clear other app data or localStorage here
    localStorage.clear();
    sessionStorage.clear();

    // Redirect to login page after logout
    router.push("/login");
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
