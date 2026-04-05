import * as React from "react";

import CollapsibleCard from "@/ui2/components/CollapsibleCard";

type MoreInformationItem = {
  title: string;
  body: React.ReactNode;
};

type Props = {
  id: string;
  subtitle?: string;
  summary?: React.ReactNode;
  defaultCollapsed?: boolean;
  items: readonly MoreInformationItem[];
};

export default function MoreInformationPanel({
  id,
  subtitle = "Open when you need the longer explanation. The main workspace stays focused on live decisions.",
  summary,
  defaultCollapsed = true,
  items,
}: Props) {
  return (
    <CollapsibleCard
      id={id}
      title="More information"
      subtitle={subtitle}
      right={summary}
      defaultCollapsed={defaultCollapsed}
    >
      <div
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        {items.map((item) => (
          <section
            key={item.title}
            style={{
              display: "grid",
              gap: 6,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.025)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.64)",
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.82)",
              }}
            >
              {item.body}
            </div>
          </section>
        ))}
      </div>
    </CollapsibleCard>
  );
}

