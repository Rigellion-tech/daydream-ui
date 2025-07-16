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

    // ✅ Handle redirect to www if user lands on naked domain
    if (
      window.location.hostname === "daydreamforge.com" &&
      process.env.NODE_ENV === "production"
    ) {
      const url = new URL(window.location.href);
      url.hostname = "www.daydreamforge.com";
      window.location.replace(url.toString());
      return;
    }

    // ✅ Only redirect if user is logged in and on the root page
    if (userId && window.location.pathname === "/") {
      router.replace("/chat");
    }
  }, [router]);

  return <>{children}</>;
}
