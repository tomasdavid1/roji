/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "roji-black": "var(--roji-black)",
        "roji-dark": "var(--roji-dark)",
        "roji-darker": "var(--roji-darker)",
        "roji-card": "var(--roji-card)",
        "roji-border": "var(--roji-border)",
        "roji-border-hover": "var(--roji-border-hover)",
        "roji-text": "var(--roji-text)",
        "roji-muted": "var(--roji-muted)",
        "roji-dim": "var(--roji-dim)",
        "roji-accent": "var(--roji-accent)",
        "roji-accent-hover": "var(--roji-accent-hover)",
        "roji-accent-subtle": "var(--roji-accent-subtle)",
        "roji-success": "var(--roji-success)",
        "roji-warning": "var(--roji-warning)",
        "roji-danger": "var(--roji-danger)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { roji: "8px", "roji-lg": "12px" },
      letterSpacing: {
        tightest: "-0.02em",
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
        "roji-glow":
          "0 0 40px rgba(79, 109, 245, 0.18), 0 8px 24px rgba(79, 109, 245, 0.12)",
        "roji-glow-strong":
          "0 0 60px rgba(79, 109, 245, 0.32), 0 10px 28px rgba(79, 109, 245, 0.22)",
      },
    },
  },
  plugins: [],
};
