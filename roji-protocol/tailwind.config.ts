import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        roji: {
          black: "#0a0a0f",
          dark: "#111118",
          darker: "#0d0d14",
          card: "#16161f",
          border: "rgba(255, 255, 255, 0.06)",
          "border-hover": "rgba(255, 255, 255, 0.12)",
          text: "#f0f0f5",
          muted: "#8a8a9a",
          dim: "#55556a",
          accent: "#4f6df5",
          "accent-hover": "#6380ff",
          "accent-subtle": "rgba(79, 109, 245, 0.08)",
          success: "#22c55e",
          warning: "#eab308",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.02em",
      },
      borderRadius: {
        roji: "8px",
        "roji-lg": "12px",
      },
      keyframes: {
        "roji-caret": {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "roji-orb-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(2%, -1%, 0) scale(1.05)" },
        },
      },
      animation: {
        "roji-caret": "roji-caret 1.05s steps(2, end) infinite",
        "roji-orb-drift": "roji-orb-drift 14s ease-in-out infinite",
      },
      boxShadow: {
        "roji-glow": "0 0 40px rgba(79, 109, 245, 0.18), 0 8px 24px rgba(79, 109, 245, 0.12)",
        "roji-glow-strong":
          "0 0 60px rgba(79, 109, 245, 0.32), 0 10px 28px rgba(79, 109, 245, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
