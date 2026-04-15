"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authApi } from "@/lib/api-client";
import type { MeDto } from "@/types";
import { useState } from "react";

interface NavbarProps {
  user: MeDto;
}

const userLinks = [
  { href: "/entry", label: "Efor Girişi" },
  { href: "/history", label: "Geçmişim" },
];

const adminLinks = [
  { href: "/entry", label: "Efor Girişi" },
  { href: "/history", label: "Geçmişim" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin/teams", label: "Takımlar" },
  { href: "/admin/users", label: "Kullanıcılar" },
];

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const links = user.role === "ADMIN" ? adminLinks : userLinks;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } finally {
      router.push("/login");
    }
  }

  return (
    <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/entry" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-sm">
              M
            </div>
            <span className="font-semibold text-gray-900">Momentum</span>
          </Link>

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                ].join(" ")}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User info + profile link + logout */}
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="hidden sm:block text-right hover:opacity-80 transition-opacity"
            >
              <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
              <p className="text-xs text-gray-500">
                {user.teamName ?? <span className="text-amber-500">Takım seçilmedi</span>}
                {" · "}
                {user.role === "ADMIN" ? "Admin" : "Kullanıcı"}
              </p>
            </Link>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loggingOut ? "Çıkılıyor…" : "Çıkış"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
