/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ProductPitchPage's SKU-cleanup regex is content, not an arbitrary CSS rule.
  blocklist: ["[-:/]"],
  theme: {
    extend: {},
  },
  plugins: [],
};
