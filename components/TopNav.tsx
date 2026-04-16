"use client";

/**
 * Learn4Africa — shared top navigation.
 *
 * Every marketing-style page used to inline its own <nav> markup,
 * which meant any tweak (new link, new brand, new breakpoint) had
 * to be copied across ~8 files. This component collapses that into
 * one place. Pages pass `currentPath` so the active link can be
 * highlighted.
 *
 * The learning-room (`/tracks/:id/:n`) intentionally does NOT use
 * this — it has its own specialised toolbar.
 */

import Link from "next/link";
import { useState } from "react";

import { UserMenu } from "@/components/UserMenu";
import { Globe } from "@/lib/icons";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/tracks", label: "Career Tracks" },
  { href: "/curriculum/new", label: "Build a Path" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/tutor", label: "AI Tutor" },
];

interface TopNavProps {
  /** Pathname of the current page, used to highlight the active link. */
  currentPath?: string;
}

function isActive(currentPath: string | undefined, href: string): boolean {
  if (!currentPath) return false;
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function TopNav({ currentPath }: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Skip-to-content link — unchanged from the old inline nav.
          Rendered outside the <nav> so it is reachable first by
          keyboard users. */}
      <a href="#main" className="skip-to-content">
        Skip to content
      </a>

      <nav
        aria-label="Primary"
        className="fixed top-0 w-full bg-warm-50/80 backdrop-blur-md border-b border-warm-200/60 z-50 font-sans"
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <Link
              href="/"
              className="flex items-center gap-2.5"
              aria-label="Learn4Africa home"
            >
              <Globe className="w-5 h-5 text-warm-700" />
              <span className="text-lg font-semibold tracking-tight text-warm-900">
                Learn4Africa
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => {
                const active = isActive(currentPath, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`text-sm transition-colors ${
                      active
                        ? "text-warm-900 font-semibold"
                        : "text-warm-600 hover:text-warm-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <UserMenu />
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="topnav-mobile-drawer"
              className="md:hidden p-2 -mr-2 text-warm-700 hover:text-warm-900"
            >
              {/* Two-bar hamburger / close icon drawn inline — avoids
                  adding a new icon export just for the nav. */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {mobileOpen ? (
                  <>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div
            id="topnav-mobile-drawer"
            className="md:hidden border-t border-warm-200/60 bg-warm-50"
          >
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3 flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(currentPath, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`py-2 text-sm rounded-lg px-2 transition-colors ${
                      active
                        ? "text-warm-900 font-semibold bg-warm-100"
                        : "text-warm-700 hover:bg-warm-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-warm-200/60 mt-2">
                <UserMenu />
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
