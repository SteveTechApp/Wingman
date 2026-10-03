/** Illustrative application imagery; never presented as a photograph of the customer's site. */
export function projectPresentation(name: string) {
  const match = [
    { pattern: /hospitality|hotel|bar\b|venue|restaurant/i, label: "Hospitality", image: "discovery-hospitality-v2.jpg" },
    { pattern: /classroom|teaching|education|college|learning/i, label: "Education", image: "discovery-classroom-v2.jpg" },
    { pattern: /control|command|security|operations|emergency/i, label: "Control room", image: "photo-control-room.jpg" },
    { pattern: /retail|signage|shop/i, label: "Retail & signage", image: "photo-signage.jpg" },
    { pattern: /boardroom|meeting|conference|corporate/i, label: "Meeting spaces", image: "discovery-boardroom-v2.jpg" },
  ].find((item) => item.pattern.test(name));
  const base = String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return { label: match?.label || "AV project", image: match ? `${base}/template-photos/${match.image}` : undefined };
}
