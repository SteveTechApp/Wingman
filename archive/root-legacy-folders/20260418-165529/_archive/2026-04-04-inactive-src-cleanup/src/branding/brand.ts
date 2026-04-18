// Wingman unified brand configuration
// Single source of truth for all branding across the app

export const brand = {
  // Core identity
  appName: "Wingman",
  company: "WyreStorm",
  fullName: "WyreStorm Wingman",
  tagline: "AV System Design Platform",
  monogram: "W",

  // UI text system (prevents hardcoding everywhere)
  labels: {
    project: "Current Project",
    system: "System Type",
    summary: "System Summary",
  },

  get displayName() {
    return `${this.company} ${this.appName}`;
  },
} as const;
