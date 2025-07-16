"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const cookies = document.cookie
      .split("; ")
      .reduce((acc: Record<string, string>, pair) => {
        const [key, value] = pair.split("=");
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});

    const userId = cookies["user_id"] || null;

    console.log("Cookies in AuthLayout:", cookies);
    console.log("Detected userId:", userId);
    console.log("Current hostname:", window.location.hostname);
    console.log("Current pathname:", window.location.pathname);

    // Redirect naked domain → www
    if (
      window.location.hostname === "daydreamforge.com" &&
      window.location.protocol === "https:"
    ) {
      const url = new URL(window.location.href);
      url.hostname = "www.daydreamforge.com";
      console.log("Redirecting to www domain:", url.toString());
      window.location.replace(url.toString());
      return;
    }

    // Redirect logged-in users away from login page
    if (userId && window.location.pathname === "/") {
      console.log("Redirecting logged-in user to /chat");
      router.replace("/chat");
      return;
    }

    // Redirect non-logged-in users away from protected pages
    if (!userId && window.location.pathname.startsWith("/chat")) {
      console.log("Redirecting guest user to login page");
      router.replace("/");
      return;
    }
  }, [router]);

  return <>{children}</>;
}
