"use client";

import { useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Remove the user_id cookie
    Cookies.remove("user_id");

    // Optionally clear other app data or localStorage here

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
