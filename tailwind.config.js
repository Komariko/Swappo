/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "360px", // ✅ จอเล็กมาก (มือถือจอเล็ก)
      },
    },
  },
  plugins: [require("@tailwindcss/line-clamp")],
};
