import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fff4ee",
          100: "#ffe6d4",
          200: "#ffc9a8",
          300: "#ffa270",
          400: "#ff7037",
          500: "#ff6000",
          600: "#e85500",
          700: "#c44200",
          800: "#9c3500",
          900: "#7a2a00",
        },
        past: {
          light: "#fef3c7",
          DEFAULT: "#f59e0b",
          dark: "#d97706",
        },
        today: {
          light: "#dbeafe",
          DEFAULT: "#3b82f6",
          dark: "#1d4ed8",
        },
        future: {
          light: "#d1fae5",
          DEFAULT: "#10b981",
          dark: "#059669",
        },
      },
    },
  },
  plugins: [],
};
export default config;
