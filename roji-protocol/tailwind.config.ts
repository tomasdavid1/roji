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
    },
  },
  plugins: [],
};

export default config;
