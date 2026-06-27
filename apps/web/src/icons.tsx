import React from 'react';

interface IconProps { size?: number; stroke?: number; color?: string; }
const base = (size: number, stroke: number, color: string) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const Sun: React.FC<IconProps> = ({ size = 17, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const Moon: React.FC<IconProps> = ({ size = 17, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);
export const ChevronLeft: React.FC<IconProps> = ({ size = 18, stroke = 2, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="m15 18-6-6 6-6" /></svg>
);
export const ChevronRight: React.FC<IconProps> = ({ size = 18, stroke = 2, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="m9 18 6-6-6-6" /></svg>
);
export const Layout: React.FC<IconProps> = ({ size = 17, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
);
export const Help: React.FC<IconProps> = ({ size = 17, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><circle cx="12" cy="12" r="9" /><path d="M9.1 9.5a3 3 0 1 1 5.4 1.9c-.8 1-2 1.4-2.4 2.6" /><path d="M12 17h.01" /></svg>
);
export const Info: React.FC<IconProps> = ({ size = 17, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
);
export const Download: React.FC<IconProps> = ({ size = 17, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
);
export const Gear: React.FC<IconProps> = ({ size = 17, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
export const Users: React.FC<IconProps> = ({ size = 17, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
export const Project: React.FC<IconProps> = ({ size = 15, stroke = 2, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
);
export const Close: React.FC<IconProps> = ({ size = 18, stroke = 2, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const Minimize: React.FC<IconProps> = ({ size = 20, stroke = 2, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
);
export const Check: React.FC<IconProps> = ({ size = 15, stroke = 2.2, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M20 6 9 17l-5-5" /></svg>
);
export const Alert: React.FC<IconProps> = ({ size = 24, stroke = 1.7, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
);
export const Calendar: React.FC<IconProps> = ({ size = 24, stroke = 1.6, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
export const Link: React.FC<IconProps> = ({ size = 15, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" /></svg>
);
export const Database: React.FC<IconProps> = ({ size = 17, stroke = 1.7, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>
);
export const LogOut: React.FC<IconProps> = ({ size = 15, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
);
export const Refresh: React.FC<IconProps> = ({ size = 16, stroke = 1.8, color = 'currentColor' }) => (
  <svg {...base(size, stroke, color)}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" /></svg>
);
