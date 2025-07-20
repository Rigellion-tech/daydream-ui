// AuthLayout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const cookieId = Cookies.get("user_id");
    const localId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    const userId = cookieId || localId || null;

    const path = window.location.pathname;
    const hostname = window.location.hostname;

    console.log("Detected userId:", userId);
    console.log("Current hostname:", hostname);
    console.log("Current pathname:", path);

    // Redirect naked domain → www
    if (hostname === "daydreamforge.com" && window.location.protocol === "https:") {
      const url = new URL(window.location.href);
      url.hostname = "www.daydreamforge.com";
      console.log("Redirecting to www domain:", url.toString());
      window.location.replace(url.toString());
      return;
    }

    const isAuthPage = ["/", "/login", "/register"].includes(path);
    const isLogoutPage = path === "/logout";

    if (!isLogoutPage) {
      if (userId && isAuthPage) {
        console.log("Redirecting logged-in user to /chat");
        router.replace("/chat");
        return;
      }

      if (!userId && path.startsWith("/chat")) {
        console.log("Redirecting guest user to login page");
        router.replace("/");
        return;
      }
    }

    setAuthChecked(true);
  }, [router]);

  // Prevent flicker during auth check
  if (!authChecked) return null;

  return <>{children}</>;
}
