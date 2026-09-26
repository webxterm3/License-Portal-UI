"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getProduct } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    } else if (getProduct()) {
      router.replace("/dashboard");
    } else {
      router.replace("/products");
    }
  }, [router]);
  return null;
}
