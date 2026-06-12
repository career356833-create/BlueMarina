import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17212b",
        muted: "#687586",
        line: "#dfe6ee",
        surface: "#f7f9fb",
        brand: {
          50: "#edf8f5",
          100: "#d5f0e9",
          500: "#2aa889",
          600: "#17876d",
          700: "#126c58"
        },
        accent: {
          100: "#fff1cc",
          500: "#f2ad2e"
        }
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 33, 43, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
