"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0078d4]/5 to-white px-4">
      <div className="text-center">
        <span className="text-7xl">🔬</span>
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-gray-900">
          NSB Coach
        </h1>
        <p className="mt-3 text-xl text-gray-500">
          National Science Bowl Coaching Platform
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex h-12 w-44 items-center justify-center rounded-lg bg-[#0078d4] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#006abc]"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-12 w-44 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
