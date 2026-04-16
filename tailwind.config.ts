import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Warm, desaturated palette — one accent, consistent warm-tinted grays
        zigama: {
          50: "#FAF6F1",
          100: "#F2EADE",
          200: "#E8D9C4",
          300: "#D4BC9A",
          400: "#C09A6F",
          500: "#B07D4F",  // Primary warm amber — desaturated from pure orange
          600: "#9A6840",
          700: "#7D5234",
          800: "#63402A",
          900: "#4D3222",
        },
        earth: {
          50: "#FAF9F6",
          100: "#F0EDE6",
          200: "#DDD8CC",
          300: "#C4BBAA",
          400: "#A89B84",
          500: "#8B7A63",
          600: "#6F604A",
          700: "#584B3A",
          800: "#453A2E",
          900: "#372F25",
        },
        // Muted sage green — replaces oversaturated savanna
        sage: {
          50: "#F4F7F4",
          100: "#E4ECE4",
          200: "#C9D9CA",
          300: "#A3BEA5",
          400: "#7A9F7D",
          500: "#5C8360",
          600: "#476A4B",
          700: "#39553D",
          800: "#2F4432",
          900: "#273829",
        },
        // Warm-tinted grays — not cool, not neutral
        warm: {
          50: "#FAFAF7",
          100: "#F3F2EE",
          200: "#E8E6E0",
          300: "#D5D2CA",
          400: "#B5B1A6",
          500: "#94907F",
          600: "#716D60",
          700: "#5A574D",
          800: "#3D3B34",
          900: "#272621",
          950: "#1A1915",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Outfit", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Source Serif 4", "Georgia", "serif"],
      },
      animation: {
        "fade-in": "fadeIn 400ms cubic-bezier(0.23, 1, 0.32, 1)",
        "slide-up": "slideUp 500ms cubic-bezier(0.23, 1, 0.32, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      letterSpacing: {
        "tight-display": "-0.035em",
      },
    },
  },
  plugins: [],
};

export default config;
