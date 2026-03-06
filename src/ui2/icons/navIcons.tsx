import * as React from "react";
// src/ui2/icons/navIcons.tsx

type IconProps = { size?: number; stroke?: string; opacity?: number };

function baseProps(p: IconProps){
  const size = p.size ?? 16;
  const stroke = p.stroke ?? "currentColor";
  const opacity = p.opacity ?? 0.92;
  return { size, stroke, opacity };
}

export function IconGrid(p: IconProps){
  const { size, stroke, opacity } = baseProps(p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path d="M4 4h7v7H4V4Z" stroke={stroke} strokeWidth="2" />
      <path d="M13 4h7v7h-7V4Z" stroke={stroke} strokeWidth="2" />
      <path d="M4 13h7v7H4v-7Z" stroke={stroke} strokeWidth="2" />
      <path d="M13 13h7v7h-7v-7Z" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

export function IconFolder(p: IconProps){
  const { size, stroke, opacity } = baseProps(p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke={stroke} strokeWidth="2" />
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

export function IconUpload(p: IconProps){
  const { size, stroke, opacity } = baseProps(p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path d="M12 16V4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M7 8l5-5 5 5" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconBook(p: IconProps){
  const { size, stroke, opacity } = baseProps(p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path d="M4 19a2 2 0 0 0 2 2h14V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v13Z" stroke={stroke} strokeWidth="2" />
      <path d="M8 8h8" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 12h8" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSpark(p: IconProps){
  const { size, stroke, opacity } = baseProps(p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path d="M12 2l1.3 4.2L18 7.5l-4.2 1.3L12 13l-1.3-4.2L6 7.5l4.7-1.3L12 2Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M19 13l.8 2.6L22 16l-2.2.4L19 19l-.8-2.6L16 16l2.2-.4L19 13Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconBoxes(p: IconProps){
  const { size, stroke, opacity } = baseProps(p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path d="M3 7l9-4 9 4-9 4-9-4Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M3 7v10l9 4 9-4V7" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M12 11v10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function IconCompare(p: IconProps){
  const { size, stroke, opacity } = baseProps(p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path d="M10 3H5a2 2 0 0 0-2 2v14" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 3h5a2 2 0 0 1 2 2v14" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 7h4" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 11H8" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 7h-4" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 11h4" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function IconWand(p: IconProps){
  const { size, stroke, opacity } = baseProps(p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path d="M4 20l10-10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 17l-3 3" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 4l6 6" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconWall(p: IconProps){
  const { size, stroke, opacity } = baseProps(p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path d="M4 5h16v14H4V5Z" stroke={stroke} strokeWidth="2"/>
      <path d="M4 12h16" stroke={stroke} strokeWidth="2"/>
      <path d="M12 5v14" stroke={stroke} strokeWidth="2"/>
    </svg>
  );
}

export function IconDoc(p: IconProps){
  const { size, stroke, opacity } = baseProps(p);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke={stroke} strokeWidth="2"/>
      <path d="M14 3v4h4" stroke={stroke} strokeWidth="2"/>
      <path d="M8 12h8" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 16h6" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}