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
        "roji-success": "var(--roji-success)",
        "roji-warning": "var(--roji-warning)",
        "roji-danger": "var(--roji-danger)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { roji: "8px", "roji-lg": "12px" },
    },
  },
  plugins: [],
};
