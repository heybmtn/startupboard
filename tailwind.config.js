/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: {
          bg: "#0b1020",
          panel: "#121936",
          line: "#2a3568",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
      },
      boxShadow: {
        tile: "0 4px 14px rgba(0,0,0,0.35)",
      },
      keyframes: {
        claim: {
          "0%": { transform: "scale(1)", boxShadow: "0 0 0 rgba(255,255,255,0)" },
          "40%": { transform: "scale(1.06)", boxShadow: "0 0 30px rgba(255,255,255,0.55)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0 rgba(255,255,255,0)" },
        },
      },
      animation: {
        claim: "claim 0.9s ease-out",
      },
    },
  },
  plugins: [],
};
