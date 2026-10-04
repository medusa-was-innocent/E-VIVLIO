import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (p: P) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconSearch = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>
);
export const IconBook = (p: P) => (
  <svg {...base(p)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 4.5v15Z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></svg>
);
export const IconArticle = (p: P) => (
  <svg {...base(p)}><path d="M6 2h9l4 4v16H6z" /><path d="M15 2v4h4" /><path d="M9.5 12h6M9.5 15.5h6" /></svg>
);
export const IconDownload = (p: P) => (
  <svg {...base(p)}><path d="M12 3v11" /><path d="m7.5 10 4.5 4.5L16.5 10" /><path d="M4.5 20h15" /></svg>
);
export const IconFileDown = (p: P) => (
  <svg {...base(p)}><path d="M6 2h9l4 4v16H6z" /><path d="M15 2v4h4" /><path d="M12.5 9.5v6" /><path d="m10 13.5 2.5 2.5 2.5-2.5" /></svg>
);
export const IconExternal = (p: P) => (
  <svg {...base(p)}><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M19 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></svg>
);
export const IconChevron = (p: P) => (
  <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>
);
export const IconClock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconX = (p: P) => (
  <svg {...base(p)}><path d="m6 6 12 12M18 6 6 18" /></svg>
);
export const IconCopy = (p: P) => (
  <svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="m4.5 12.5 5 5 10-11" /></svg>
);
export const IconAlert = (p: P) => (
  <svg {...base(p)}><path d="M12 3.5 22 20H2Z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.2" r="0.4" fill="currentColor" /></svg>
);
export const IconTerminal = (p: P) => (
  <svg {...base(p)}><rect x="2.5" y="4" width="19" height="16" rx="2.5" /><path d="m7 9.5 3 2.5-3 2.5" /><path d="M12.5 15h5" /></svg>
);
export const IconGithub = (p: P) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.72.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
  </svg>
);
export const IconArrowRight = (p: P) => (
  <svg {...base(p)}><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></svg>
);
export const IconGlobe = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5Z" /></svg>
);
export const IconRefresh = (p: P) => (
  <svg {...base(p)}><path d="M20 5v5h-5" /><path d="M20 10a8 8 0 1 0 .9 4" /></svg>
);
export const IconQuote = (p: P) => (
  <svg {...base(p)}><path d="M10 7H6.5A2.5 2.5 0 0 0 4 9.5v1A2.5 2.5 0 0 0 6.5 13H8v1.5A2.5 2.5 0 0 1 5.5 17" /><path d="M20 7h-3.5A2.5 2.5 0 0 0 14 9.5v1a2.5 2.5 0 0 0 2.5 2.5H18v1.5a2.5 2.5 0 0 1-2.5 2.5" /></svg>
);
export const IconSpinner = (p: P) => (
  <svg {...base(p)} className={`animate-spin ${p.className ?? ""}`}><path d="M12 3a9 9 0 1 0 9 9" /></svg>
);
export const IconSparkle = (p: P) => (
  <svg {...base(p)}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>
);
export const IconHeart = (p: P) => (
  <svg {...base(p)}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></svg>
);
export const IconBolt = (p: P) => (
  <svg {...base(p)}><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></svg>
);
export const IconSave = (p: P) => (
  <svg {...base(p)}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>
);
export const IconStamp = (p: P) => (
  <svg {...base(p)}><rect x="3" y="13" width="18" height="4" rx="1" /><path d="M12 3v10M8 7h8" /><path d="M5 17v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" /></svg>
);

/** Bibliothēkē mark — Greek beta on a warm orange tile */
export const LogoMark = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="7" fill="#f0a32f" />
    <text x="16" y="22" textAnchor="middle" fontFamily="Georgia, serif" fontSize="18" fontWeight="700" fill="#0c1f31">
      β
    </text>
  </svg>
);
