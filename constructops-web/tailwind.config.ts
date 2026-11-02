import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "var(--co-paper)",
          sunk: "var(--co-paper-2)",
          raised: "var(--co-sheet)",
        },
        ink: {
          DEFAULT: "var(--co-ink)",
          soft: "var(--co-ink-soft)",
        },
        muted: "var(--co-muted)",
        line: {
          DEFAULT: "var(--co-line)",
          strong: "var(--co-line-strong)",
        },
        revision: "var(--co-revision)",
        brand: {
          primary: "var(--brand-primary)",
          secondary: "var(--brand-secondary)",
          bg: "var(--brand-bg)",
          surface: "var(--brand-surface)",
          ink: "var(--brand-ink)",
          "primary-ink": "var(--brand-ink)",
          "secondary-ink": "var(--brand-secondary-ink)",
          "bg-ink": "var(--brand-bg-ink)",
          "surface-ink": "var(--brand-surface-ink)",
        },
      },
      fontFamily: {
        display: ["var(--font-archivo)", "Arial Narrow", "Arial", "sans-serif"],
        body: ["var(--font-archivo)", "Arial Narrow", "Arial", "sans-serif"],
        stencil: ["var(--font-stencil)", "Impact", "Haettenschweiler", "sans-serif"],
      },
      boxShadow: {
        sheet: "0 24px 60px -40px rgba(21, 32, 43, 0.45)",
        hard: "4px 4px 0 0 var(--co-ink)",
        "hard-revision": "4px 4px 0 0 var(--co-revision)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
      },
    },
  },
  plugins: [],
};

export default config;
