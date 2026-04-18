"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: Record<string, NavLink[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Students", href: "/admin/students" },
    { label: "Questions", href: "/admin/questions" },
    { label: "Tests", href: "/admin/tests" },
    { label: "Invite Codes", href: "/admin/invite-codes" },
    { label: "Coaches", href: "/admin/coaches" },
    { label: "Settings", href: "/admin/settings" },
  ],
  COACH: [
    { label: "Dashboard", href: "/coach/dashboard" },
    { label: "Students", href: "/coach/students" },
    { label: "Questions", href: "/coach/questions" },
    { label: "Tests", href: "/coach/tests" },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/student/dashboard" },
    { label: "Study Log", href: "/student/study-log" },
    { label: "Quiz", href: "/student/quiz" },
    { label: "Progress", href: "/student/progress" },
  ],
};

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!session?.user) return null;

  const role = session.user.role;
  const links = NAV_LINKS[role] ?? [];

  return (
    <nav className="bg-[#0078d4] text-white shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Brand */}
          <Link
            href={links[0]?.href ?? "/"}
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <span className="text-xl">🔬</span>
            NSB Coach
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-2 rounded-md px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-white/20 md:hidden">
          <div className="space-y-1 px-4 py-3">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
