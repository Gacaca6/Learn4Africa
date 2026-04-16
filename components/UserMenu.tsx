"use client";

/**
 * Learn4Africa — User menu for top navigation.
 *
 * Shows:
 *   - "Sign in" / "Create account" buttons when logged out
 *   - Avatar + name with a dropdown when logged in (profile, portfolio, sign out)
 *
 * Drop this into any page's nav bar:
 *   import { UserMenu } from "@/components/UserMenu";
 *   <UserMenu />
 */

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/useAuth";
import { ChevronDown, GraduationCap, User } from "@/lib/icons";

export function UserMenu() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (isLoading) {
    return (
      <div className="w-9 h-9 rounded-full bg-warm-100 animate-pulse" aria-hidden />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/login"
          className="text-sm font-semibold text-earth-700 hover:text-warm-700 px-3 py-1.5"
        >
          Sign in
        </Link>
        {/* "Start free" replaces the old "Start Learning" CTA —
            it drops the learner straight into the curriculum builder. */}
        <Link
          href="/curriculum/new"
          className="text-sm font-semibold bg-warm-900 hover:bg-warm-800 text-warm-50 px-4 py-2 rounded-lg transition"
        >
          Start free
        </Link>
      </div>
    );
  }

  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-warm-50 transition"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name || "User"}
            className="w-8 h-8 rounded-full object-cover border border-warm-200"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-warm-500 to-warm-700 text-white text-sm font-bold flex items-center justify-center">
            {initials}
          </span>
        )}
        <span className="hidden sm:inline text-sm font-semibold text-earth-800 max-w-[10rem] truncate">
          {user.name || user.email}
        </span>
        <ChevronDown className="w-4 h-4 text-earth-500" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-xl border border-warm-100 bg-white shadow-xl overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-warm-100">
            <div className="text-sm font-semibold text-earth-900 truncate">
              {user.name || "Learner"}
            </div>
            {user.email && (
              <div className="text-xs text-earth-500 truncate">{user.email}</div>
            )}
          </div>
          <MenuLink href="/tracks" icon={<GraduationCap className="w-4 h-4" />}>
            Career tracks
          </MenuLink>
          <MenuLink href="/portfolio" icon={<User className="w-4 h-4" />}>
            My portfolio
          </MenuLink>
          <div className="border-t border-warm-100">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left px-4 py-2.5 text-sm text-earth-700 hover:bg-warm-50"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2.5 text-sm text-earth-700 hover:bg-warm-50"
    >
      {icon}
      {children}
    </Link>
  );
}
