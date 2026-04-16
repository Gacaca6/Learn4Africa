import type { Metadata, Viewport } from "next";
import { Outfit, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Learn4Africa — Free AI Learning for Africa",
  description:
    "Every child deserves knowledge that changes their life. Learn4Africa transforms any topic into courses with reading, flashcards, quizzes, podcasts, comics, games, and songs — powered by AI, free forever.",
  keywords: [
    "free learning",
    "Africa education",
    "AI tutor",
    "free courses",
    "learn for free",
    "African languages",
  ],
  authors: [{ name: "Learn4Africa" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#B07D4F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${sourceSerif.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
