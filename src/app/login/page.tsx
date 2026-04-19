"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Floaties from "@/components/Floaties";

function LoginForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const successMessage = searchParams.get("success");

  // Redirect if already logged in
  useEffect(() => {
    if (session?.user?.role) {
      const role = session.user.role;
      if (role === "ADMIN") router.push("/admin/dashboard");
      else if (role === "COACH") router.push("/coach/dashboard");
      else router.push("/student/dashboard");
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    // After successful sign-in, the session will update and the
    // useEffect above will redirect based on role.
    setLoading(false);
  };

  return (
    <div className="science-bg flex items-center justify-center px-4 py-10">
      <Floaties />
      <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 text-center">
          <span className="inline-block text-5xl animate-bounce">🔬</span>
          <h1 className="mt-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-3xl font-extrabold text-transparent">
            NSB Coach
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-600">
            Ready to conquer the Science Bowl? 🚀
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? "Signing in…" : "Let's go! 🚀"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-[#0078d4] hover:text-[#006abc]"
          >
            Sign up with an invite code
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
