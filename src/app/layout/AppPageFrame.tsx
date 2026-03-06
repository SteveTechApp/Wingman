import * as React from "react";

export default function AppPageFrame({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="wm-route-frame">
      <div className="wm-route-frame__inner">
        {children}
      </div>
    </div>
  );
}