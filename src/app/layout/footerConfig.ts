export type CorporateLink = {
  label: string;
  href: string;
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

export const APP_VERSION = tidy(__APP_VERSION__) || "0.1.0";
export const APP_BUILD_COMMIT = tidy(__APP_BUILD_COMMIT__);
export const APP_BUILD_NUMBER = tidy(__APP_BUILD_NUMBER__);
export const APP_BUILD_DATE = tidy(__APP_BUILD_DATE__);
export const APP_BUILD_CHANNEL = tidy(__APP_BUILD_CHANNEL__);

const displayParts = [
  `v${APP_VERSION}`,
  APP_BUILD_NUMBER ? `build ${APP_BUILD_NUMBER}` : "",
  APP_BUILD_COMMIT && APP_BUILD_COMMIT !== "local" ? `sha ${APP_BUILD_COMMIT.slice(0, 8)}` : "",
].filter(Boolean);

export const APP_VERSION_LABEL = displayParts.join(" · ");

export const CORPORATE_LINKS: CorporateLink[] = [
  { label: "WyreStorm.com", href: "https://www.wyrestorm.com/" },
  { label: "Product Resources", href: "https://www.wyrestorm.com/product-resources/" },
  { label: "Support Request", href: "https://www.wyrestorm.com/support-request/" },
  { label: "Contact", href: "https://www.wyrestorm.com/contact-us/" },
  { label: "Privacy", href: "https://www.wyrestorm.com/privacy-policy/" },
  { label: "Terms", href: "https://www.wyrestorm.com/terms-conditions/" },
];
