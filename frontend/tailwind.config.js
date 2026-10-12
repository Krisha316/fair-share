/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ink: "#141b34",
        inkSoft: "#1e2748",
        brand: "#5b5bf0",
        canvas: "#f5f6fb",
        cream: "#faf8f3",
        sand: "#fdf1d6",
        mint: "#e6f4ec",
        money: "#2e7d5b",
        rose: "#c2445a",
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};