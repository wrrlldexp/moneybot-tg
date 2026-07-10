/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: "var(--tg-theme-bg-color, #1a1a2e)",
          text: "var(--tg-theme-text-color, #e4e4e7)",
          hint: "var(--tg-theme-hint-color, #71717a)",
          link: "var(--tg-theme-link-color, #60a5fa)",
          button: "var(--tg-theme-button-color, #3b82f6)",
          "button-text": "var(--tg-theme-button-text-color, #ffffff)",
          secondary: "var(--tg-theme-secondary-bg-color, #16162a)",
          header: "var(--tg-theme-header-bg-color, #0f0f23)",
          accent: "var(--tg-theme-accent-text-color, #818cf8)",
        },
      },
    },
  },
  plugins: [],
};
