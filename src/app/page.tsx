"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Floaties from "@/components/Floaties";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.role) {
      const role = session.user.role;
      if (role === "ADMIN") router.push("/admin/dashboard");
      else if (role === "COACH") router.push("/coach/dashboard");
      else router.push("/student/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="science-bg flex flex-col items-center justify-center px-4">
      <Floaties />
      <div className="text-center">
        <span className="inline-block text-7xl animate-bounce">🔬</span>
        <h1 className="mt-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
          NSB Coach
        </h1>
        <p className="mt-3 text-xl font-medium text-gray-700">
          🚀 Your launchpad for Science Bowl greatness! 🧪
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex h-12 w-44 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-12 w-44 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
