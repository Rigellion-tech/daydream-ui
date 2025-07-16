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
    const cookies = document.cookie.split("; ");
    const loggedIn = cookies.some((c) => c.startsWith("user_id="));

    if (loggedIn && window.location.pathname === "/") {
      router.push("/chat");
    }
  }, []);

  return <>{children}</>;
}
