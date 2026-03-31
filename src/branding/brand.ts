// Wingman unified brand configuration
// Single source of truth for all branding across the app

import logoCompact from "@/assets/branding/wingman-logo-compact.png";

export const brand = {
  // Core identity
  appName: "Wingman",
  company: "WyreStorm",
  fullName: "WyreStorm Wingman",
  tagline: "AV System Design Platform",

  // Logos (use contextually)
  logos: {
    // ✅ USE THIS in TopBar, sidebar, app UI
    app: logoCompact,

    // Reserved for future expansion (landing/marketing if needed)
    hero: logoCompact,
  },

  // UI text system (prevents hardcoding everywhere)
  labels: {
    project: "Current Project",
    system: "System Type",
    summary: "System Summary",
  },

  // Helper getters (clean usage across components)
  get logo() {
    return this.logos.app;
  },

  get displayName() {
    return `${this.company} ${this.appName}`;
  },
} as const;