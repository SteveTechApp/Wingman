import React from 'react';

interface IconProps {
  className?: string;
}

export const HdmiIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10.5V6.75a.75.75 0 0 0-.75-.75H2.75a.75.75 0 0 0-.75.75v3.75c0 .28.14.53.37.67l8.26 5.16a.75.75 0 0 0 .74 0l8.26-5.16a.75.75 0 0 0 .37-.67Z"/>
    </svg>
);
export const UsbCIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="5" width="10" height="14" rx="3" />
    </svg>
);
export const DisplayPortIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 5H2v14h14l5-5V5Z" />
    </svg>
);
export const VgaIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10.5V6.75a.75.75 0 0 0-.75-.75H2.75a.75.75 0 0 0-.75.75v3.75c0 .28.14.53.37.67l8.26 5.16a.75.75 0 0 0 .74 0l8.26-5.16a.75.75 0 0 0 .37-.67Z"/>
        <circle cx="9" cy="12" r="0.5" fill="currentColor" />
        <circle cx="12" cy="12" r="0.5" fill="currentColor" />
        <circle cx="15" cy="12" r="0.5" fill="currentColor" />
    </svg>
);
export const AudioJackIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 12v-6" />
        <path d="M12 12l4-2" />
    </svg>
);
export const XlrIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="8" r="1" fill="currentColor" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
);
export const DirectIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
);
export const HdbasetIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <text x="12" y="16" fontSize="8" textAnchor="middle" fill="currentColor" stroke="none">HDBT</text>
    </svg>
);
export const AvoipIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 12h10" /><circle cx="7" cy="12" r="1" fill="currentColor" /><circle cx="17" cy="12" r="1" fill="currentColor" />
    </svg>
);
export const FiberIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8c3-3 6 3 9 0s6 3 9 0" />
        <path d="M3 16c3-3 6 3 9 0s6 3 9 0" />
    </svg>
);