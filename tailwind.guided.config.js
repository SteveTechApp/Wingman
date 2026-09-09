/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/wingman2/pages/discovery/DiscoveryGuidedInterview.tsx"],
  important: '[data-wingman-guided-interview="true"]',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
