/* ============================================================
   Security Butler Nexus - Frontend Application
   ============================================================ */

const SVG_ICONS = {
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  lightbulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
  zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  alertTriangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
  messageSquare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  refreshCw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  moreHorizontal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  bedroom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11h20"/><path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 16h20"/><path d="M5 16v4"/><path d="M19 16v4"/></svg>',
  kitchen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M9 6h.01"/><path d="M15 6h.01"/><path d="M5 12h14"/></svg>',
  bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><line x1="10" y1="5" x2="8" y2="5"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="7" y1="19" x2="7" y2="21"/><line x1="17" y1="19" x2="17" y2="21"/></svg>',
  meeting: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  office: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  thermometer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
  droplet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><circle cx="12" cy="14" r="4"/><line x1="12" y1="6" x2="12.01" y2="6"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  doorOpen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4H6a2 2 0 0 0-2 2v14"/><path d="M11 20h9"/><path d="M14 4v16h9V7z"/><circle cx="17" cy="14" r="0.5" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  battery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"/><line x1="23" y1="13" x2="23" y2="11"/></svg>',
  homeAssistant: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/></svg>',
  knx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 8l4 4-4 4M13 8l4 4-4 4"/></svg>',
  matter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7v10l10 5 10-5V7z"/><path d="M12 22V12"/><path d="M2 7l10 5 10-5"/></svg>',
  zigbee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 8l8 8M8 16l8-8"/></svg>',
  bluetooth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg>',
  database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/></svg>',
  shieldCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
  monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
  hub: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="5" cy="12" r="2"/><path d="M12 7v3M17 12h-3M12 14v3M7 12h3"/></svg>',
  bellRing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M2 6c.6.5 1.2 1 2.5 1"/><path d="M22 6c-.6.5-1.2 1-2.5 1"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y2="23" x1="1" y2="23"/></svg>',
  sunset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9V2"/><line x1="4.22" y1="10.22 5.64 11.64"/><line x1="1" y1="18h2"/><line x1="21" y1="18h2"/><line x1="18.36" y1="11.64l1.42-1.42"/><line x1="23" y2="22H1"/></svg>',
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  bookOpen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
};

const AI_MODELS = [
  { value: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B (免费)' },
  { value: 'meta-llama/llama-3.1-405b-instruct:free', label: 'Llama 3.1 405B Instruct (免费)' },
  { value: 'meta-llama/llama-3.2-90b-vision-instruct:free', label: 'Llama 3.2 90B Vision (免费)' },
  { value: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B Instruct (免费)' },
  { value: 'microsoft/phi-3-medium-128k-instruct:free', label: 'Phi 3 Medium 128K (免费)' },
  { value: 'openrouter/auto', label: 'OpenRouter Auto (自动选择)' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
];

const state = {
  currentPage: 'overview',
  currentRoom: 'living',
  currentRoomTab: 'control',
  currentView: 'daily',
  overviewTab: 'live',
  settings: null,
  devices: [],
  traces: [],
  alerts: [],
  chatMessages: [],
  chatSessions: [],
  isAgentReady: false,
  initialized: false,
  intervals: [],
  isChatLoading: false,
  layoutPrefs: null,
};

/* ============================================================
   Utilities
   ============================================================ */

function icon(name) {
  return SVG_ICONS[name] || SVG_ICONS.activity;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatNumber(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();
}

const LAYOUT_STORAGE_KEY = 'nexus_layout_prefs';
const DEFAULT_LAYOUT_PREFS = {
  spaces: true,
  fusion: true,
  trace: true,
  roomPanel: true,
  aiInsight: true,
  securityScore: true,
};

function closeAllPopovers() {
  document.querySelectorAll('.dropdown-panel.open').forEach((el) => el.classList.remove('open'));
}

function openModal(title, bodyHtml, footerHtml = '') {
  const overlay = document.getElementById('modalOverlay');
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  const footerEl = document.getElementById('modalFooter');
  if (!overlay || !titleEl || !bodyEl || !footerEl) return;
  closeAllPopovers();
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  footerEl.innerHTML = footerHtml;
  overlay.style.display = 'flex';
}

function closeModal(event) {
  if (event && event.target && event.target.id !== 'modalOverlay' && !event.target.classList.contains('modal-close')) {
    return;
  }
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.style.display = 'none';
}

function showAboutModal() {
  closeAllPopovers();
  openModal('关于 Security Butler Nexus', `
    <p>智能家居 AI 安全管家 Nexus 控制台</p>
    <dl class="detail-kv">
      <dt>版本</dt><dd>v0.4.0</dd>
      <dt>架构</dt><dd>多协议融合 + AI 安全分析</dd>
      <dt>支持协议</dt><dd>Home Assistant / Node-RED / KNX / Matter</dd>
    </dl>
  `, '<button class="btn-primary" onclick="closeModal()">关闭</button>');
}

function showDetailModal(title, rows) {
  const body = `<dl class="detail-kv">${rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`).join('')}</dl>`;
  openModal(title, body, '<button class="btn-primary" onclick="closeModal()">关闭</button>');
}

async function toggleNotificationsPanel(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('notificationsPanel');
  if (!panel) return;
  const willOpen = !panel.classList.contains('open');
  closeAllPopovers();
  if (!willOpen) return;
  panel.classList.add('open');
  const list = document.getElementById('notificationsList');
  if (list) list.innerHTML = '<div class="empty-state">加载中...</div>';
  const result = await apiFetch('/api/alerts?limit=8');
  const alerts = result && result.success && result.data ? result.data : [];
  if (!list) return;
  if (alerts.length === 0) {
    list.innerHTML = '<div class="empty-state">暂无新通知</div>';
    return;
  }
  list.innerHTML = alerts.map((alert) => `
    <div class="notification-item">
      <strong>${escapeHtml(alert.title || '安全告警')}</strong>
      <p>${escapeHtml(alert.description || '')}</p>
    </div>
  `).join('');
}

function toggleUserMenu(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('userMenuPanel');
  if (!panel) return;
  const willOpen = !panel.classList.contains('open');
  closeAllPopovers();
  if (willOpen) panel.classList.add('open');
}

async function openGlobalSearch() {
  closeAllPopovers();
  openModal('全局搜索', `
    <div class="form-group">
      <label>搜索设备、场景、告警</label>
      <input type="text" class="form-input" id="globalSearchInput" placeholder="输入关键词..." oninput="performGlobalSearch(this.value)">
    </div>
    <div id="globalSearchResults"><div class="empty-state">输入关键词开始搜索</div></div>
  `, '<button class="btn-outline" onclick="closeModal()">关闭</button>');
  setTimeout(() => document.getElementById('globalSearchInput')?.focus(), 50);
  if (state.devices.length === 0) {
    const result = await apiFetch('/api/devices');
    state.devices = result && result.success && result.data ? result.data : [];
  }
}

async function performGlobalSearch(query) {
  const container = document.getElementById('globalSearchResults');
  if (!container) return;
  const keyword = (query || '').trim().toLowerCase();
  if (!keyword) {
    container.innerHTML = '<div class="empty-state">输入关键词开始搜索</div>';
    return;
  }

  const [devicesResult, scenesResult, alertsResult] = await Promise.all([
    state.devices.length ? Promise.resolve({ success: true, data: state.devices }) : apiFetch('/api/devices'),
    apiFetch('/api/scenes'),
    apiFetch('/api/alerts?limit=50'),
  ]);

  const devices = devicesResult && devicesResult.success ? devicesResult.data : [];
  const scenes = scenesResult && scenesResult.success ? scenesResult.data : [];
  const alerts = alertsResult && alertsResult.success ? alertsResult.data : [];

  const results = [];
  for (const d of devices) {
    const text = [d.name, d.entity_id, d.attributes?.area_name].filter(Boolean).join(' ').toLowerCase();
    if (text.includes(keyword)) results.push({ type: '设备', title: d.name || d.entity_id, meta: d.entity_id, action: () => navigateTo('devices') });
  }
  for (const s of scenes) {
    const text = [s.name, s.description].filter(Boolean).join(' ').toLowerCase();
    if (text.includes(keyword)) results.push({ type: '场景', title: s.name, meta: s.description || s.type, action: () => navigateTo('scenes') });
  }
  for (const a of alerts) {
    const text = [a.title, a.description].filter(Boolean).join(' ').toLowerCase();
    if (text.includes(keyword)) results.push({ type: '告警', title: a.title || '告警', meta: a.severity || '', action: () => navigateTo('security') });
  }

  if (results.length === 0) {
    container.innerHTML = '<div class="empty-state">未找到匹配结果</div>';
    return;
  }

  container.innerHTML = results.slice(0, 12).map((item, index) => `
    <div class="search-result-item" onclick="handleSearchResult(${index})">
      <div>${icon(item.type === '设备' ? 'cpu' : item.type === '场景' ? 'zap' : 'alertTriangle')}</div>
      <div>
        <div><strong>${escapeHtml(item.title)}</strong> <span style="color:var(--text-tertiary);font-size:12px">${escapeHtml(item.type)}</span></div>
        <div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(item.meta || '')}</div>
      </div>
    </div>
  `).join('');
  state._searchResults = results.slice(0, 12);
}

function handleSearchResult(index) {
  const item = state._searchResults?.[index];
  if (!item) return;
  closeModal();
  item.action();
}

function getLayoutPrefs() {
  if (state.layoutPrefs) return state.layoutPrefs;
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) || 'null');
    state.layoutPrefs = { ...DEFAULT_LAYOUT_PREFS, ...(saved || {}) };
  } catch {
    state.layoutPrefs = { ...DEFAULT_LAYOUT_PREFS };
  }
  return state.layoutPrefs;
}

function applyLayoutPreferences() {
  const prefs = getLayoutPrefs();
  document.body.classList.toggle('layout-hide-fusion', !prefs.fusion);
  document.body.classList.toggle('layout-hide-trace', !prefs.trace);
  document.body.classList.toggle('layout-hide-room', !prefs.roomPanel);
  document.body.classList.toggle('layout-hide-ai', !prefs.aiInsight);
  document.body.classList.toggle('layout-hide-score', !prefs.securityScore);
}

function customLayout() {
  const prefs = getLayoutPrefs();
  openModal('自定义布局', `
    <p style="color:var(--text-secondary);margin-bottom:12px">选择概览页显示的模块，设置将保存在本机浏览器。</p>
    ${[
      ['spaces', '空间状态'],
      ['fusion', 'Fusion 总线'],
      ['trace', '事件追踪'],
      ['roomPanel', '房间面板'],
      ['aiInsight', 'AI 安全洞察'],
      ['securityScore', '安全评分'],
    ].map(([key, label]) => `
      <label class="layout-option">
        <input type="checkbox" id="layout-${key}" ${prefs[key] ? 'checked' : ''}>
        <span>${label}</span>
      </label>
    `).join('')}
  `, `
    <button class="btn-outline" onclick="closeModal()">取消</button>
    <button class="btn-primary" onclick="saveLayoutPreferences()">保存布局</button>
  `);
}

function saveLayoutPreferences() {
  const prefs = { ...DEFAULT_LAYOUT_PREFS };
  for (const key of Object.keys(prefs)) {
    const el = document.getElementById(`layout-${key}`);
    if (el) prefs[key] = el.checked;
  }
  state.layoutPrefs = prefs;
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(prefs));
  applyLayoutPreferences();
  closeModal();
  showToast('布局已保存', 'success');
}

function initOverviewTabs() {
  document.querySelectorAll('[data-overview-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.overviewTab;
      state.overviewTab = tab;
      document.querySelectorAll('[data-overview-tab]').forEach((b) => b.classList.toggle('active', b.dataset.overviewTab === tab));
      const live = document.getElementById('overviewLivePanel');
      const trends = document.getElementById('overviewTrendsPanel');
      if (live) live.style.display = tab === 'live' ? 'grid' : 'none';
      if (trends) trends.style.display = tab === 'trends' ? 'block' : 'none';
      if (tab === 'trends') loadTrendsOverview();
    });
  });
}

async function loadTrendsOverview() {
  const container = document.getElementById('overviewTrendsContent');
  if (!container) return;
  container.innerHTML = '<div class="empty-state">加载趋势数据...</div>';
  const result = await apiFetch('/api/trends?range=week');
  const data = result && result.success ? result.data : null;
  if (!data) {
    container.innerHTML = '<div class="empty-state">暂无趋势数据</div>';
    return;
  }

  const score = data.securityScore?.overall ?? 0;
  const alertTotal = data.alerts?.total ?? 0;
  const deviceOnline = data.devices?.currentOnlineRate != null ? Math.round(data.devices.currentOnlineRate * 100) : 0;
  const energy = data.energy?.totalConsumption != null ? data.energy.totalConsumption.toFixed(1) : '0';

  container.innerHTML = `
    <div class="trend-grid">
      <div class="trend-stat-card"><div class="label">安全评分</div><div class="value">${score}</div></div>
      <div class="trend-stat-card"><div class="label">本周告警</div><div class="value">${alertTotal}</div></div>
      <div class="trend-stat-card"><div class="label">设备在线率</div><div class="value">${deviceOnline}%</div></div>
      <div class="trend-stat-card"><div class="label">总能耗 (kWh)</div><div class="value">${energy}</div></div>
    </div>
    <div class="trend-list">
      ${(data.securityScore?.dimensions || []).map((dim) => `
        <div class="trend-list-row"><span>${escapeHtml(dim.name)}</span><strong>${dim.score} 分</strong></div>
      `).join('')}
    </div>
  `;
}

function addSpace() {
  openModal('添加空间', `
    <p>空间数据由 Home Assistant 区域自动同步。请在 Home Assistant 中创建区域（Area），并为设备分配区域后刷新。</p>
    <div class="form-group" style="margin-top:16px">
      <label>空间名称（备注）</label>
      <input type="text" class="form-input" id="newSpaceName" placeholder="例如：书房">
    </div>
  `, `
    <button class="btn-outline" onclick="closeModal()">取消</button>
    <button class="btn-primary" onclick="refreshSpacesAfterNote()">刷新空间列表</button>
  `);
}

function refreshSpacesAfterNote() {
  const name = document.getElementById('newSpaceName')?.value?.trim();
  closeModal();
  loadAllSpaces();
  loadSpaces();
  showToast(name ? `已刷新空间列表，请在 HA 中创建「${name}」区域` : '空间列表已刷新', 'success');
  navigateTo('spaces');
}

async function createScene() {
  openModal('创建智能场景', `
    <div class="form-group">
      <label>场景描述</label>
      <textarea class="form-input" id="newSceneDescription" rows="4" placeholder="例如：回家时自动开灯、打开空调并关闭安防模式"></textarea>
    </div>
    <div class="form-group">
      <label>目标平台</label>
      <select class="form-input" id="newScenePlatform">
        <option value="homeassistant">Home Assistant</option>
        <option value="knx-gateway">KNX 网关</option>
      </select>
    </div>
    <div id="createSceneResult"></div>
  `, `
    <button class="btn-outline" onclick="closeModal()">取消</button>
    <button class="btn-primary" onclick="submitCreateScene()">AI 生成场景</button>
  `);
}

async function submitCreateScene() {
  const description = document.getElementById('newSceneDescription')?.value?.trim();
  const platform = document.getElementById('newScenePlatform')?.value || 'homeassistant';
  const resultBox = document.getElementById('createSceneResult');
  if (!description) {
    showToast('请输入场景描述', 'warning');
    return;
  }
  if (resultBox) resultBox.innerHTML = '<div class="empty-state">正在生成...</div>';
  const result = await apiFetch('/api/automation/generate', {
    method: 'POST',
    body: JSON.stringify({ description, platform }),
  });
  if (!resultBox) return;
  if (result.success && result.data) {
    const summary = result.data.summary || result.data.description || '场景方案已生成';
    resultBox.innerHTML = `<div class="ai-suggestion"><p>${escapeHtml(summary)}</p></div>`;
    showToast('场景方案已生成', 'success');
  } else {
    resultBox.innerHTML = `<div class="empty-state">${escapeHtml(result.error || '生成失败')}</div>`;
    showToast('场景生成失败', 'error');
  }
}

async function loadChatHistory() {
  const container = document.getElementById('chatHistoryList');
  if (!container) return;
  const result = await apiFetch('/api/chat/sessions');
  const sessions = result && result.success && result.data ? result.data : [];
  state.chatSessions = sessions;
  if (sessions.length === 0) {
    container.innerHTML = '<div class="history-item active">默认对话</div>';
    return;
  }
  container.innerHTML = sessions.map((session, index) => `
    <div class="history-item ${index === 0 ? 'active' : ''}" data-session-id="${escapeHtml(session.id || '')}" onclick="switchChatSession('${escapeHtml(session.id || '')}', this)">${escapeHtml(session.title || '对话 ' + (index + 1))}</div>
  `).join('');
}

function switchChatSession(sessionId, el) {
  document.querySelectorAll('.history-item').forEach((item) => item.classList.remove('active'));
  if (el) el.classList.add('active');
  state.currentChatSessionId = sessionId || 'default';
  loadChatSessionMessages(state.currentChatSessionId);
}

async function loadChatSessionMessages(sessionId) {
  const sid = sessionId || 'default';
  const result = await apiFetch(`/api/chat/sessions/${encodeURIComponent(sid)}/messages`);
  const messages = result && result.success && result.data ? result.data : [];
  if (messages.length === 0) {
    state.chatMessages = [{
      role: 'assistant',
      content: '该会话暂无历史消息，开始新的对话吧。',
    }];
  } else {
    state.chatMessages = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content || '',
    }));
  }
  renderChat();
  showToast(messages.length ? `已加载 ${messages.length} 条历史消息` : '已切换对话会话', 'info');
}

function getHealthLabel(score, alertCount) {
  if (alertCount > 5 || score < 60) return { text: '需关注', className: 'warning' };
  if (score >= 85) return { text: '优秀', className: 'success' };
  if (score >= 70) return { text: '良好', className: 'success' };
  return { text: '一般', className: 'pending' };
}

async function updateTopbarStatus() {
  const result = await apiFetch('/api/status');
  const data = result && result.success ? result.data : null;
  if (!data) return;

  const health = getHealthLabel(data.securityScore || 0, data.activeAlerts || 0);
  const healthValue = document.getElementById('healthValue');
  const healthDot = document.getElementById('healthDot');
  const healthPill = document.getElementById('healthPill');
  if (healthValue) healthValue.textContent = health.text;
  if (healthPill) healthPill.className = `health-pill health-${health.className}`;

  const dot = document.getElementById('topbarNotificationDot');
  if (dot) dot.style.display = data.activeAlerts > 0 ? 'block' : 'none';

  const fusionScore = document.getElementById('fusionHealthScore');
  if (fusionScore) fusionScore.textContent = health.text;
}

async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    return await res.json();
  } catch (e) {
    console.error('API error:', e);
    return { success: false, error: e.message };
  }
}

/* ============================================================
   Navigation
   ============================================================ */

function navigateTo(page) {
  state.currentPage = page;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  const pageTitles = {
    overview: '概览',
    spaces: '空间管理',
    scenes: '场景中心',
    devices: '设备列表',
    security: '安全中心',
    fusion: 'Fusion 融合',
    knx: 'KNX 工作室',
    ai: 'AI 助手',
    chat: 'AI 助手',
    diagnostics: '系统诊断',
    settings: '系统设置',
  };

  const breadcrumb = document.getElementById('breadcrumbCurrent');
  if (breadcrumb) breadcrumb.textContent = pageTitles[page] || page;

  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  const pageId = page === 'chat' ? 'page-ai' : `page-${page}`;
  const pageEl = document.getElementById(pageId);
  if (pageEl) pageEl.style.display = 'block';

  if (page === 'overview') loadOverviewData();
  if (page === 'spaces') loadAllSpaces();
  if (page === 'scenes') loadScenes();
  if (page === 'devices') loadDevices();
  if (page === 'settings') loadSettings();
  if (page === 'security') loadSecurityData();
  if (page === 'fusion') loadFusionPage();
  if (page === 'knx') loadKnxStudioPage();
  if (page === 'diagnostics') loadDiagnostics();

  history.replaceState(null, '', page === 'knx' ? '#/knx' : `#/${page}`);
}

/* ============================================================
   Overview Page
   ============================================================ */

function loadOverviewData() {
  loadSpaces();
  loadFusionStats();
  loadTraces();
  loadSecurityScoreMini();
  loadAISuggestion();
}

async function loadSpaces() {
  const container = document.getElementById('spacesGrid');
  if (!container) return;

  container.innerHTML = '<div class="empty-state">加载中...</div>';

  const result = await apiFetch('/api/rooms');
  const rooms = result && result.success && result.data ? result.data : [];

  if (rooms.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无房间数据，请先配置 Home Assistant</div>';
    return;
  }

  container.innerHTML = rooms.map((space, index) => {
    const type = getRoomTypeFromName(space.name);
    return `
    <div class="space-card" data-room="${space.id}" onclick="selectRoom('${space.id}', '${escapeHtml(space.name)}')">
      <div class="space-hero ${type}">
        <div class="space-hero-icon">${icon(getRoomIcon(type))}</div>
      </div>
      <div class="space-info">
        <div class="space-name-row">
          <span class="space-name">${escapeHtml(space.name)}</span>
          <span class="space-status-dot"></span>
        </div>
        <div class="space-stats">
          <div class="stat-item">${icon('cpu')}<span class="stat-value">${space.deviceCount} 实体</span></div>
          <div class="stat-item">${icon('activity')}<span class="stat-value">${space.offlineCount ?? 0} 不可用</span></div>
        </div>
        <div class="space-footer">
          <span>共 ${space.deviceCount} 个 · ${space.onlineCount} 有状态反馈</span>
          <span class="space-device-count">查看 ${icon('chevronRight')}</span>
        </div>
      </div>
    </div>
  `}).join('');
}

function getRoomTypeFromName(name) {
  const n = name.toLowerCase();
  if (n.includes('客厅') || n.includes('living')) return 'living';
  if (n.includes('卧室') || n.includes('bedroom') || n.includes('主卧') || n.includes('次卧')) return 'bedroom';
  if (n.includes('厨房') || n.includes('kitchen')) return 'kitchen';
  if (n.includes('卫生间') || n.includes('bathroom') || n.includes('厕所') || n.includes('浴室')) return 'bath';
  if (n.includes('书房') || n.includes('office')) return 'office';
  if (n.includes('会议') || n.includes('茶室') || n.includes('meeting')) return 'meeting';
  return 'living';
}

function getRoomIcon(type) {
  const map = {
    living: 'home',
    bedroom: 'bedroom',
    kitchen: 'kitchen',
    bathroom: 'bath',
    meeting: 'meeting',
    office: 'office',
  };
  return map[type] || 'home';
}

async function loadFusionStats() {
  const container = document.getElementById('fusionFlow');
  if (!container) return;

  container.innerHTML = '<div class="trace-empty">加载中...</div>';

  const result = await apiFetch('/api/collectors');
  const collectors = result && result.success && result.data ? result.data : [];

  if (collectors.length === 0) {
    container.innerHTML = '<div class="trace-empty">暂无采集器配置</div>';
    return;
  }

  container.innerHTML = collectors.map(node => {
    const isOnline = node.status === 'connected' || node.status === 'online';
    const iconName = getCollectorIcon(node.type);
    const baseUrlDisplay = node.baseUrl ? node.baseUrl.replace(/^https?:\/\//, '') : '未配置';
    return `
    <div class="fusion-node">
      <div class="fusion-node-icon">${icon(iconName)}</div>
      <div class="fusion-node-title">${escapeHtml(node.name)}</div>
      <div class="fusion-node-meta">${escapeHtml(baseUrlDisplay)}</div>
      <div class="fusion-node-status" style="color: ${isOnline ? 'var(--accent-success)' : 'var(--text-tertiary)'}">${isOnline ? '已连接' : node.enabled ? '连接中' : '未启用'}</div>
    </div>
  `}).join('');
}

async function loadTraces() {
  const container = document.getElementById('traceContent');
  if (!container) return;

  const result = await apiFetch('/api/alerts?limit=10');
  const alerts = result && result.success && result.data ? result.data : [];

  if (alerts.length === 0) {
    container.innerHTML = '<div class="trace-empty">暂无事件日志</div>';
    return;
  }

  const traces = alerts.map(a => {
    const severityMap = {
      low: { type: 'info', label: '低' },
      medium: { type: 'info', label: '中' },
      high: { type: 'warning', label: '高' },
      critical: { type: 'error', label: '严重' },
    };
    const sev = severityMap[a.severity] || severityMap.low;
    return {
      time: a.timestamp || new Date(),
      type: sev.type,
      msg: `${sev.label}级: ${a.title || a.description}`,
    };
  });

  container.innerHTML = traces.map(t => `
    <div class="trace-item">
      <span class="trace-time">${formatTime(t.time)}</span>
      <span class="trace-type ${t.type}">${t.type.toUpperCase()}</span>
      <span class="trace-msg">${escapeHtml(t.msg)}</span>
    </div>
  `).join('');
}

async function loadSecurityScoreMini() {
  const scoreEl = document.getElementById('miniScore');
  const scoreItemsContainer = document.querySelector('.security-mini-card .score-items');
  if (!scoreEl || !scoreItemsContainer) return;

  const result = await apiFetch('/api/status');
  const statusData = result && result.success && result.data ? result.data : null;
  const score = statusData?.securityScore || 0;
  const scoreDetails = statusData?.scoreDetails || {};

  scoreEl.textContent = score;

  const detailLabels = {
    device: '设备安全',
    door: '门禁安全',
    away: '离家模式',
    energy: '能耗安全',
  };

  const detailColors = {
    device: 'var(--accent-success)',
    door: 'var(--accent-success)',
    away: 'var(--accent-warning)',
    energy: 'var(--accent-warning)',
  };

  const items = Object.entries(scoreDetails).map(([key, value]) => ({
    label: detailLabels[key] || key,
    value: value,
    color: detailColors[key] || 'var(--accent-primary)',
  }));

  if (items.length === 0) {
    items.push(
      { label: '设备安全', value: 0, color: 'var(--accent-success)' },
      { label: '门禁安全', value: 0, color: 'var(--accent-success)' },
      { label: '离家模式', value: 0, color: 'var(--accent-warning)' },
      { label: '能耗安全', value: 0, color: 'var(--accent-warning)' },
    );
  }

  scoreItemsContainer.innerHTML = items.map(item => `
    <div class="score-item-row">
      <span class="score-item-label">${item.label}</span>
      <div class="score-item-bar">
        <div class="score-item-fill" style="width: ${item.value}%; background: ${item.color}"></div>
      </div>
      <span class="score-item-value">${item.value}</span>
    </div>
  `).join('');
}

async function loadAISuggestion() {
  const container = document.getElementById('aiSuggestion');
  if (!container) return;

  container.innerHTML = '<div class="ai-suggestion"><p>正在分析家庭安全状况...</p></div>';

  try {
    const result = await apiFetch('/api/insights');
    const data = result && result.success ? result.data : null;
    let contentHtml = '';

    if (data) {
      const lines = [`当前安全评分 ${data.securityScore} 分（${data.grade}）`];
      if (data.weaknesses && data.weaknesses.length > 0) {
        lines.push('需要关注：');
        data.weaknesses.slice(0, 2).forEach((item) => lines.push(`- ${item}`));
      }
      if (data.recommendations && data.recommendations.length > 0) {
        lines.push('建议：');
        data.recommendations.forEach((item) => lines.push(`- ${item}`));
      } else if (data.recentAlerts && data.recentAlerts.length > 0) {
        lines.push('近期告警：');
        data.recentAlerts.forEach((alert) => lines.push(`- ${alert.title}`));
      } else {
        lines.push('系统运行正常，未发现明显安全隐患。');
      }

      contentHtml = `<div class="ai-suggestion">${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</div>`;
    } else {
      contentHtml = `
        <div class="ai-suggestion">
          <p style="color: var(--accent-success);"><strong>当前未检测到安全隐患</strong></p>
          <p style="color: var(--text-secondary); margin-top: 8px;">系统运行正常，所有设备状态良好。</p>
        </div>
      `;
    }

    container.innerHTML = contentHtml + `
      <button class="btn-primary btn-full" onclick="navigateTo('chat')">
        ${icon('sparkles')} 与 AI 安全管家对话
      </button>
    `;
  } catch (e) {
    container.innerHTML = `
      <div class="ai-suggestion">
        <p>暂时无法获取 AI 安全洞察，请检查数据源与 AI 配置。</p>
      </div>
      <button class="btn-primary btn-full" onclick="navigateTo('chat')">
        ${icon('sparkles')} 与 AI 安全管家对话
      </button>
    `;
  }
}

function selectRoom(roomId, roomName) {
  state.currentRoom = roomId;
  const roomNameEl = document.getElementById('currentRoomName');
  if (roomNameEl && roomName) {
    roomNameEl.textContent = roomName;
  }
  loadRoomDevices(roomId);
}

async function loadRoomDevices(roomId) {
  const container = document.getElementById('roomDevices');
  const countEl = document.getElementById('roomDeviceCount');
  if (!container) return;

  container.innerHTML = '<div class="trace-empty">加载中...</div>';

  const result = await apiFetch('/api/devices');
  const devices = result && result.success && result.data ? result.data : [];

  const roomDevices = devices.filter(d => {
    const area = d.attributes?.area_name || d.attributes?.room || '';
    return area && area.toLowerCase().replace(/\s+/g, '-') === roomId;
  });

  if (roomDevices.length === 0) {
    container.innerHTML = '<div class="trace-empty">该房间暂无设备</div>';
    if (countEl) countEl.textContent = '0 个';
    return;
  }

  if (countEl) countEl.textContent = roomDevices.length + ' 个';

  const groups = groupDevicesByDomain(roomDevices);

  container.innerHTML = groups.map(group => `
    <div class="device-group">
      <div class="group-header">
        <span class="group-title">${group.title}</span>
        <span class="group-count">${group.devices.length}</span>
      </div>
      <div class="device-list">
        ${group.devices.map(d => {
          const isOn = d.state && d.state !== 'off' && d.state !== 'unavailable' && d.state !== 'unknown';
          return `
          <div class="device-item">
            <div class="device-icon">${icon(getDeviceIcon(d.domain || d.type))}</div>
            <div class="device-info">
              <div class="device-name">${escapeHtml(d.name || d.entity_id)}</div>
              <div class="device-sub">${escapeHtml(d.state || '未知')}</div>
            </div>
            <div class="device-toggle ${isOn ? 'active' : ''}" data-entity-id="${escapeHtml(d.entity_id || d.id)}" onclick="toggleDevice(this)"></div>
          </div>
        `}).join('')}
      </div>
    </div>
  `).join('');
}

function groupDevicesByDomain(devices) {
  const domainMap = {
    light: '照明',
    switch: '开关',
    climate: '环境',
    fan: '环境',
    humidifier: '环境',
    lock: '安防',
    camera: '安防',
    binary_sensor: '传感器',
    sensor: '传感器',
    cover: '窗帘',
    media_player: '娱乐',
  };

  const groups = {};
  for (const d of devices) {
    const domain = d.domain || d.entity_id?.split('.')[0] || 'other';
    const title = domainMap[domain] || domain;
    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(d);
  }

  return Object.entries(groups).map(([title, devices]) => ({ title, devices }));
}

async function loadRoomScenes() {
  const container = document.getElementById('roomScenes');
  if (!container) return;

  const result = await apiFetch('/api/scenes');
  const scenes = result && result.success && result.data ? result.data : [];

  if (scenes.length === 0) {
    container.innerHTML = '<div class="trace-empty">暂无场景</div>';
    return;
  }

  const displayScenes = scenes.slice(0, 4);

  container.innerHTML = displayScenes.map((s, index) => {
    const iconName = getSceneIcon(s.name, index);
    return `
    <div class="scene-quick-item" onclick="activateScene('${escapeHtml(s.id)}', '${escapeHtml(s.name)}')">
      <div class="scene-quick-icon">${icon(iconName)}</div>
      <div class="scene-quick-name">${escapeHtml(s.name)}</div>
    </div>
  `}).join('');
}

function getSceneIcon(name, index) {
  const n = name.toLowerCase();
  if (n.includes('回家') || n.includes('home')) return 'home';
  if (n.includes('离家') || n.includes('away') || n.includes('布防')) return 'doorOpen';
  if (n.includes('观影') || n.includes('电影') || n.includes('movie') || n.includes('film')) return 'film';
  if (n.includes('睡眠') || n.includes('睡觉') || n.includes('sleep') || n.includes('moon')) return 'moon';
  if (n.includes('阅读') || n.includes('书') || n.includes('read')) return 'bookOpen';
  if (n.includes('早餐') || n.includes('早晨') || n.includes('morning')) return 'sunrise';
  const icons = ['home', 'doorOpen', 'film', 'moon', 'sunrise', 'bookOpen', 'music', 'shieldCheck'];
  return icons[index % icons.length];
}

async function activateScene(sceneId, sceneName) {
  const result = await apiFetch('/api/scenes/activate', {
    method: 'POST',
    body: JSON.stringify({ id: sceneId, name: sceneName }),
  });

  if (result.success && result.data?.success) {
    showToast(result.data.message || `已激活场景: ${sceneName || sceneId}`, 'success');
  } else {
    showToast(result.data?.message || result.error || '场景激活失败', 'error');
  }
}

function initRoomTabs() {
  document.querySelectorAll('.room-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.room-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentRoomTab = tab.textContent.trim();
      loadRoomTabContent(state.currentRoomTab);
    });
  });
}

async function loadRoomTabContent(tabName) {
  const container = document.getElementById('roomPanelBody');
  if (!container) return;

  if (tabName === '控制') {
    loadRoomDevices(state.currentRoom);
    loadRoomScenes();
    return;
  }

  if (state.devices.length === 0) {
    const result = await apiFetch('/api/devices');
    state.devices = result && result.success && result.data ? result.data : [];
  }

  const roomDevices = state.devices.filter((d) => {
    const area = d.attributes?.area_name || d.attributes?.room || '';
    return area && area.toLowerCase().replace(/\s+/g, '-') === state.currentRoom;
  });

  if (tabName === '环境') {
    const sensors = roomDevices.filter((d) => {
      const domain = d.domain || d.entity_id?.split('.')[0];
      return ['sensor', 'binary_sensor', 'climate', 'fan', 'humidifier'].includes(domain);
    });
    container.innerHTML = sensors.length ? sensors.map((d) => `
      <div class="device-item">
        <div class="device-icon">${icon(getDeviceIcon(d.domain || d.entity_id?.split('.')[0]))}</div>
        <div class="device-info">
          <div class="device-name">${escapeHtml(d.name || d.entity_id)}</div>
          <div class="device-sub">${escapeHtml(d.state || '未知')}</div>
        </div>
      </div>
    `).join('') : '<div class="trace-empty">该房间暂无环境传感器</div>';
    return;
  }

  if (tabName === '自动化') {
    const result = await apiFetch('/api/scenes');
    const scenes = result && result.success && result.data ? result.data.slice(0, 6) : [];
    container.innerHTML = scenes.length ? `<div class="scene-quick-grid">${scenes.map((s) => `
      <div class="scene-quick-item" onclick="activateScene('${escapeHtml(s.id)}', '${escapeHtml(s.name)}')">
        <div class="scene-quick-icon">${icon('zap')}</div>
        <div class="scene-quick-name">${escapeHtml(s.name)}</div>
      </div>
    `).join('')}</div>` : '<div class="trace-empty">暂无关联自动化</div>';
    return;
  }

  container.innerHTML = `
    <div class="detail-kv">
      <dt>房间 ID</dt><dd>${escapeHtml(state.currentRoom)}</dd>
      <dt>设备数量</dt><dd>${roomDevices.length}</dd>
      <dt>在线设备</dt><dd>${roomDevices.filter((d) => d.state !== 'unavailable' && d.state !== 'unknown').length}</dd>
    </div>
  `;
}

function refreshOverview() {
  showToast('正在刷新数据...', 'info');
  loadOverviewData();
  setTimeout(() => {
    showToast('数据已刷新', 'success');
  }, 500);
}

function clearTrace() {
  const container = document.getElementById('traceContent');
  if (container) {
    container.innerHTML = '<div class="trace-empty">暂无事件日志</div>';
  }
  showToast('事件日志已清空', 'success');
}

async function toggleDevice(el) {
  const entityId = el.dataset?.entityId;
  if (!entityId) {
    showToast('该设备暂不支持控制', 'info');
    return;
  }

  const isOn = el.classList.contains('active');
  const action = isOn ? 'turn_off' : 'turn_on';

  const result = await apiFetch('/api/devices/control', {
    method: 'POST',
    body: JSON.stringify({ entityId, action }),
  });

  if (result.success && result.data?.success !== false) {
    el.classList.toggle('active');
    showToast(isOn ? '设备已关闭' : '设备已开启', 'success');
  } else {
    showToast(result.error || result.data?.error || '设备控制失败', 'error');
  }
}

/* ============================================================
   Spaces Page
   ============================================================ */

async function loadAllSpaces() {
  const container = document.getElementById('fullSpacesGrid');
  if (!container) return;

  container.innerHTML = '<div class="empty-state">加载中...</div>';

  const result = await apiFetch('/api/rooms');
  const rooms = result && result.success && result.data ? result.data : [];

  if (rooms.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无房间数据，请先配置 Home Assistant</div>';
    return;
  }

  container.innerHTML = rooms.map(space => {
    const type = getRoomTypeFromName(space.name);
    return `
    <div class="space-card">
      <div class="space-hero ${type}">
        <div class="space-hero-icon">${icon(getRoomIcon(type))}</div>
      </div>
      <div class="space-info">
        <div class="space-name-row">
          <span class="space-name">${escapeHtml(space.name)}</span>
          <span class="space-status-dot"></span>
        </div>
        <div class="space-stats">
          <div class="stat-item">${icon('cpu')}<span class="stat-value">${space.deviceCount} 设备</span></div>
          <div class="stat-item">${icon('check')}<span class="stat-value">${space.onlineCount} 在线</span></div>
        </div>
        <div class="space-footer">
          <span>${space.deviceCount} 个设备</span>
          <span class="space-device-count">详情 ${icon('chevronRight')}</span>
        </div>
      </div>
    </div>
  `}).join('');
}

function toggleView(mode) {
  state.currentView = mode;
  document.querySelectorAll('.view-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === mode);
  });
  document.body.classList.toggle('view-pro', mode === 'pro');
  showToast(mode === 'pro' ? '已切换到专业视图' : '已切换到日常视图', 'info');
}

/* ============================================================
   Devices Page
   ============================================================ */

async function loadDevices() {
  const container = document.getElementById('deviceTable');
  if (!container) return;

  container.innerHTML = '<div class="empty-state">加载中...</div>';
  const result = await apiFetch('/api/devices');
  state.devices = result && result.success && result.data ? result.data : [];
  renderDeviceTable();
}

function renderDeviceTable() {
  const container = document.getElementById('deviceTable');
  if (!container) return;

  const searchEl = document.getElementById('deviceSearch');
  const filterEl = document.getElementById('deviceFilter');
  const keyword = (searchEl?.value || '').trim().toLowerCase();
  const filterType = filterEl?.value || 'all';

  let devices = [...state.devices];

  if (keyword) {
    devices = devices.filter((d) => {
      const haystack = [
        d.name,
        d.entity_id,
        d.id,
        d.attributes?.area_name,
        d.attributes?.room,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }

  if (filterType !== 'all') {
    devices = devices.filter((d) => {
      const domain = d.domain || d.entity_id?.split('.')[0] || '';
      if (filterType === 'light') return domain === 'light';
      if (filterType === 'switch') return domain === 'switch';
      if (filterType === 'curtain') return domain === 'cover';
      if (filterType === 'climate') return domain === 'climate';
      if (filterType === 'sensor') return domain === 'sensor' || domain === 'binary_sensor';
      return true;
    });
  }

  if (devices.length === 0) {
    container.innerHTML = '<div class="empty-state">没有匹配的设备</div>';
    return;
  }

  const rowsHtml = devices.map(d => {
    const domain = d.domain || d.entity_id?.split('.')[0] || 'unknown';
    const isOnline = d.state && d.state !== 'unavailable' && d.state !== 'unknown';
    const room = d.attributes?.area_name || d.attributes?.room || '未分配';
    const sourceName = getSourceLabel(d.source);
  const entityId = d.entity_id || d.id || '';
    return `
    <div class="device-row">
      <div class="device-cell-name">
        <div class="device-cell-icon">${icon(getDeviceIcon(domain))}</div>
        <span class="device-cell-name-text">${escapeHtml(d.name || d.entity_id)}</span>
      </div>
      <span class="${isOnline ? 'status-online' : 'status-offline'}">${isOnline ? '在线' : '离线'}</span>
      <span class="mono-text">${escapeHtml(sourceName)}</span>
      <span>${escapeHtml(room)}</span>
      <span class="mono-text">${escapeHtml(entityId || '—')}</span>
      <span><button class="card-icon-btn device-toggle ${isOnline && d.state !== 'off' ? 'active' : ''}" data-entity-id="${escapeHtml(entityId)}" onclick="toggleDevice(this)">${icon('zap')}</button></span>
    </div>
  `}).join('');

  container.innerHTML = `
    <div class="device-table-header">
      <span class="device-cell-name">设备名称</span>
      <span>状态</span>
      <span>来源</span>
      <span>房间</span>
      <span>ID</span>
      <span>操作</span>
    </div>
    ${rowsHtml}
  `;
}

function getSourceLabel(source) {
  const map = {
    homeassistant: 'Home Assistant',
    'home-assistant': 'Home Assistant',
    ha: 'Home Assistant',
    knx: 'KNX',
    'knx-gateway': 'KNX',
    nodered: 'Node-RED',
    'node-red': 'Node-RED',
    matter: 'Matter',
    zigbee: 'Zigbee',
  };
  return map[source] || source || '未知';
}

function getDeviceIcon(type) {
  const map = {
    light: 'lightbulb',
    lightbulb: 'lightbulb',
    switch: 'zap',
    sensor: 'activity',
    binary_sensor: 'activity',
    climate: 'thermometer',
    cover: 'layers',
    camera: 'camera',
    lock: 'lock',
    fan: 'wind',
    humidifier: 'droplet',
    media_player: 'speaker',
    default: 'cpu',
  };
  return map[type] || map.default;
}

/* ============================================================
   Scenes Page
   ============================================================ */

async function loadScenes() {
  const container = document.getElementById('scenesGrid');
  if (!container) return;

  container.innerHTML = '<div class="empty-state">加载中...</div>';

  const result = await apiFetch('/api/scenes');
  const scenes = result && result.success && result.data ? result.data : [];

  if (scenes.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无场景数据</div>';
    return;
  }

  const gradients = [
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  ];

  container.innerHTML = scenes.map((s, index) => {
    const iconName = getSceneIcon(s.name, index);
    const gradient = gradients[index % gradients.length];
    return `
    <div class="scene-card" onclick="activateScene('${escapeHtml(s.id)}', '${escapeHtml(s.name)}')">
      <div class="scene-card-icon" style="background: ${gradient}">
        ${icon(iconName)}
      </div>
      <div class="scene-card-name">${escapeHtml(s.name)}</div>
      <div class="scene-card-desc">${escapeHtml(s.description || '智能场景')}</div>
      <div class="scene-card-meta">${s.enabled ? '已启用' : '未启用'}</div>
    </div>
  `}).join('');
}

/* ============================================================
   Security Page
   ============================================================ */

function loadSecurityData() {
  loadSecurityScoreLarge();
  loadAlerts();
}

async function loadSecurityScoreLarge() {
  const scoreEl = document.getElementById('secScoreValue');
  const detailsContainer = document.querySelector('.score-details');
  if (!scoreEl || !detailsContainer) return;

  const result = await apiFetch('/api/status');
  const statusData = result && result.success && result.data ? result.data : null;
  const score = statusData?.securityScore || 0;
  const scoreDetails = statusData?.scoreDetails || {};

  scoreEl.textContent = score;

  const detailLabels = {
    device: '设备安全',
    door: '门禁安全',
    away: '离家模式',
    energy: '能耗安全',
  };

  const detailColors = {
    device: 'var(--accent-success)',
    door: 'var(--accent-success)',
    away: 'var(--accent-warning)',
    energy: 'var(--accent-warning)',
  };

  const items = Object.entries(scoreDetails).map(([key, value]) => ({
    label: detailLabels[key] || key,
    value: value,
    color: detailColors[key] || 'var(--accent-primary)',
  }));

  if (items.length === 0) {
    items.push(
      { label: '设备安全', value: 0, color: 'var(--accent-success)' },
      { label: '门禁安全', value: 0, color: 'var(--accent-success)' },
      { label: '离家模式', value: 0, color: 'var(--accent-warning)' },
      { label: '能耗安全', value: 0, color: 'var(--accent-warning)' },
    );
  }

  detailsContainer.innerHTML = items.map(item => `
    <div class="score-detail-row">
      <span class="score-detail-label">${item.label}</span>
      <div class="score-detail-bar">
        <div class="score-detail-fill" style="width: ${item.value}%; background: ${item.color}"></div>
      </div>
      <span class="score-detail-value">${item.value}</span>
    </div>
  `).join('');
}

async function loadAlerts() {
  const container = document.getElementById('securityAlerts');
  const countEl = document.getElementById('activeAlertCount');
  const badgeEl = document.getElementById('alertBadge');
  if (!container) return;

  container.innerHTML = '<div class="empty-state">加载中...</div>';

  const result = await apiFetch('/api/alerts');
  const alerts = result && result.success && result.data ? result.data : [];
  state.alerts = alerts;

  if (countEl) countEl.textContent = alerts.length;
  if (badgeEl) badgeEl.textContent = alerts.length > 0 ? alerts.length : '0';

  if (alerts.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无告警</div>';
    return;
  }

  container.innerHTML = alerts.map(alert => {
    const level = alert.severity || 'low';
    const timeStr = formatRelativeTime(alert.timestamp);
    const location = alert.device || '未知位置';
    return `
    <div class="alert-item ${level}">
      <div class="alert-icon-wrap">${icon('alertTriangle')}</div>
      <div class="alert-content">
        <div class="alert-title">${escapeHtml(alert.title || '安全告警')}</div>
        <div class="alert-desc">${escapeHtml(alert.description || '')}</div>
        <div class="alert-meta">
          <span>${icon('home')} ${escapeHtml(location)}</span>
          <span>${timeStr}</span>
        </div>
      </div>
      <button class="alert-action" onclick="handleAlertAction('${escapeHtml(alert.id || '')}')">处理</button>
    </div>
  `}).join('');
}

async function acknowledgeAlert(alertId) {
  const result = await apiFetch(`/api/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: 'POST',
  });

  if (result.success) {
    showToast('告警已处理', 'success');
    loadAlerts();
  } else {
    showToast('告警处理失败', 'error');
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '未知';
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  return Math.floor(diff / 86400000) + ' 天前';
}

/* ============================================================
   Fusion Page
   ============================================================ */

async function loadFusionPage() {
  const [collectorsResult, statusResult, scenesResult] = await Promise.all([
    apiFetch('/api/collectors'),
    apiFetch('/api/status'),
    apiFetch('/api/scenes'),
  ]);
  const collectors = collectorsResult && collectorsResult.success && collectorsResult.data ? collectorsResult.data : [];
  const statusData = statusResult && statusResult.success && statusResult.data ? statusResult.data : null;
  const scenes = scenesResult && scenesResult.success && scenesResult.data ? scenesResult.data : [];

  loadProtocols(collectors);
  loadCoreStats(statusData, scenes);
  loadEcosystem(collectors);

  const protocolCount = document.getElementById('fusionProtocolCount');
  const ecoCount = document.getElementById('fusionEcoCount');
  if (protocolCount) protocolCount.textContent = `${collectors.length} 协议`;
  if (ecoCount) ecoCount.textContent = `${collectors.filter((c) => c.enabled).length} 服务`;
}

function loadProtocols(collectors) {
  const container = document.getElementById('protocolList');
  if (!container) return;

  if (!collectors || collectors.length === 0) {
    container.innerHTML = '<div class="trace-empty">暂无协议配置</div>';
    return;
  }

  const protocolMap = {
    'knx-gateway': { name: 'KNX REST', icon: 'knx' },
    knxd: { name: 'knxd 本机', icon: 'knx' },
    'knx': { name: 'KNX', icon: 'knx' },
    'zigbee': { name: 'Zigbee', icon: 'zigbee' },
    'matter': { name: 'Matter', icon: 'matter' },
    'homeassistant': { name: 'Home Assistant', icon: 'homeAssistant' },
    'ha': { name: 'Home Assistant', icon: 'homeAssistant' },
    'nodered': { name: 'Node-RED', icon: 'zap' },
    'node-red': { name: 'Node-RED', icon: 'zap' },
    'bluetooth': { name: 'Bluetooth', icon: 'bluetooth' },
  };

  const protocols = collectors.map(c => {
    const proto = protocolMap[c.type] || { name: c.name, icon: 'cpu' };
    const isOnline = c.status === 'connected' || c.status === 'online';
    return {
      id: c.id,
      name: proto.name,
      meta: c.enabled ? (isOnline ? '已连接' : '连接中') : '未启用',
      baseUrl: c.baseUrl || '',
      icon: proto.icon,
      status: isOnline ? 'online' : (c.enabled ? 'pending' : 'offline'),
    };
  });

  container.innerHTML = protocols.map((p, index) => `
    <div class="protocol-item" onclick="showProtocolDetail(${index})">
      <div class="proto-icon">${icon(p.icon)}</div>
      <div class="proto-info">
        <div class="proto-name">${escapeHtml(p.name)}</div>
        <div class="proto-meta">${escapeHtml(p.meta)}</div>
      </div>
      <div class="proto-status ${p.status}"></div>
    </div>
  `).join('');
  state._fusionProtocols = protocols;
}

function showProtocolDetail(index) {
  const p = state._fusionProtocols?.[index];
  if (!p) return;
  showDetailModal(`${p.name} 协议详情`, [
    ['采集器', p.id || p.name],
    ['连接地址', p.baseUrl || '未配置'],
    ['运行状态', p.status === 'online' ? '已连接' : p.status === 'pending' ? '连接中' : '离线'],
    ['协议类型', p.name],
  ]);
}

/* ============================================================
   KNX Studio
   ============================================================ */

function switchKnxTab(tab) {
  document.querySelectorAll('.knx-tab').forEach((el) => {
    el.classList.toggle('active', el.dataset.knxTab === tab);
  });
  const panels = {
    overview: 'knxPanelOverview',
    config: 'knxPanelConfig',
    ets: 'knxPanelEts',
    address: 'knxPanelAddress',
    discover: 'knxPanelDiscover',
  };
  Object.entries(panels).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = key === tab ? 'block' : 'none';
  });

  if (tab === 'config') loadKnxdConfigForm();
  if (tab === 'overview') loadKnxOverview();
  if (tab === 'ets') loadKnxEtsProjects();
  if (tab === 'address') loadAddressBook();
  if (tab === 'discover') loadKnxDevices();
}

async function loadKnxStudioPage() {
  history.replaceState(null, '', '#/knx');
  switchKnxTab('overview');
  await Promise.all([loadKnxOverview(), loadKnxdConfigForm()]);
}

async function loadKnxOverview() {
  const container = document.getElementById('knxOverviewBody');
  if (!container) return;
  container.innerHTML = '<div class="empty-state">加载中...</div>';

  const result = await apiFetch('/api/knxd/status');
  if (!result || !result.success) {
    container.innerHTML = '<div class="empty-state">无法获取 knxd 状态</div>';
    return;
  }

  const { health, healthy } = result.data;
  const cfg = health.config || {};
  const statusColor = healthy ? 'var(--accent-success)' : 'var(--accent-warning, #f5a623)';
  const statusText = healthy ? '运行正常' : health.envExists ? '部分异常' : '未配置';

  container.innerHTML = `
    <div class="diag-grid">
      <div class="diag-item"><span class="diag-label">总体状态</span><span class="diag-value" style="color:${statusColor}">${statusText}</span></div>
      <div class="diag-item"><span class="diag-label">KNXnet/IP</span><span class="diag-value">${escapeHtml(health.host)}:${health.port}</span></div>
      <div class="diag-item"><span class="diag-label">端口监听</span><span class="diag-value">${health.portOpen ? '是' : '否'}</span></div>
      <div class="diag-item"><span class="diag-label">Docker 容器</span><span class="diag-value">${escapeHtml(health.containerName)} (${escapeHtml(health.containerStatus)})</span></div>
      <div class="diag-item"><span class="diag-label">物理地址</span><span class="diag-value">${escapeHtml(cfg.address || '--')}</span></div>
      <div class="diag-item"><span class="diag-label">接口</span><span class="diag-value">${escapeHtml(cfg.interface || '--')} / ${escapeHtml(cfg.device || '--')}</span></div>
      <div class="diag-item"><span class="diag-label">配置文件</span><span class="diag-value">${escapeHtml(health.envPath)}</span></div>
      <div class="diag-item"><span class="diag-label">检测时间</span><span class="diag-value">${escapeHtml(new Date(health.checkedAt).toLocaleString())}</span></div>
    </div>
  `;
}

async function loadKnxdConfigForm() {
  const result = await apiFetch('/api/knxd/config');
  const hint = document.getElementById('knxEnvPathHint');
  if (!result || !result.success) {
    if (hint) hint.textContent = '无法读取 knxd 配置';
    return;
  }

  const { envPath, envExists, config } = result.data;
  if (hint) {
    hint.textContent = `${envExists ? '配置文件' : '将创建配置文件'}：${envPath}`;
  }

  const fields = {
    knxAddress: config.address,
    knxClientAddress: config.clientAddress,
    knxInterface: config.interface,
    knxDevice: config.device,
    knxGatewayName: config.gatewayName,
    knxDebugLevel: config.debugErrorLevel,
  };

  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value != null) el.value = value;
  });
}

async function saveKnxdConfig(event) {
  event.preventDefault();
  const payload = {
    address: document.getElementById('knxAddress')?.value,
    clientAddress: document.getElementById('knxClientAddress')?.value,
    interface: document.getElementById('knxInterface')?.value,
    device: document.getElementById('knxDevice')?.value,
    gatewayName: document.getElementById('knxGatewayName')?.value,
    debugErrorLevel: document.getElementById('knxDebugLevel')?.value,
  };

  const result = await apiFetch('/api/knxd/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (result?.success) {
    showToast(result.data?.message || '配置已保存');
    await loadKnxOverview();
  } else {
    showToast(result?.error || '保存失败', 'error');
  }
}

async function loadKnxEtsProjects() {
  const container = document.getElementById('knxEtsBody');
  if (!container) return;
  container.innerHTML = '<div class="empty-state">加载中...</div>';

  const result = await apiFetch('/api/knx/ets/projects');
  const projects = result?.success ? result.data : [];
  state._knxProjects = projects;

  if (!projects.length) {
    container.innerHTML = '<div class="empty-state">暂无导入项目，请上传 .knxproj 文件</div>';
    return;
  }

  container.innerHTML = `
    <table class="knx-table">
      <thead><tr><th>项目</th><th>ETS</th><th>组地址</th><th>设备</th><th>导入时间</th><th>操作</th></tr></thead>
      <tbody>
        ${projects.map((p, index) => `
          <tr>
            <td>${escapeHtml(p.projectName || p.fileName)}</td>
            <td>${escapeHtml(p.etsVersion || '--')}</td>
            <td>${p.groupAddressCount ?? 0}</td>
            <td>${p.deviceCount ?? 0}</td>
            <td>${escapeHtml(p.importedAt ? new Date(p.importedAt).toLocaleString() : '--')}</td>
            <td>
              <button class="btn-ghost-sm" onclick="selectKnxProject(${index})">查看设备</button>
              <button class="btn-ghost-sm" onclick="importProjectAddressesByIndex(${index})">导入地址簿</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  if (!state._selectedKnxProjectId && projects[0]) {
    state._selectedKnxProjectId = projects[0].id;
  }
}

function selectKnxProject(index) {
  const project = state._knxProjects?.[index];
  if (!project) return;
  state._selectedKnxProjectId = project.id;
  switchKnxTab('discover');
}

async function uploadKnxproj(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.knxproj')) {
    showToast('请选择 .knxproj 文件', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = String(reader.result || '').split(',')[1];
    showToast('正在解析 ETS 项目...', 'info');
    const result = await apiFetch('/api/knx/ets/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, data: base64, importAddresses: true }),
    });
    if (result?.success) {
      state._selectedKnxProjectId = result.data.projectId;
      showToast(`已导入：${result.data.projectName}（组地址 ${result.data.groupAddressCount}，设备 ${result.data.deviceCount}）`, 'success');
      await loadKnxEtsProjects();
      await loadAddressBook();
      await loadKnxDevices();
    } else {
      showToast(result?.error || '导入失败', 'error');
    }
    event.target.value = '';
  };
  reader.readAsDataURL(file);
}

async function importProjectAddressesByIndex(index) {
  const project = state._knxProjects?.[index];
  if (!project) return;
  await importProjectAddresses(project.id);
}

async function importProjectAddresses(projectId) {
  const result = await apiFetch('/api/knx/address-book/import-from-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  if (result?.success) {
    showToast(`已导入 ${result.data.imported} 条组地址`, 'success');
    await loadAddressBook();
  } else {
    showToast(result?.error || '导入失败', 'error');
  }
}

async function loadAddressBook() {
  const container = document.getElementById('knxAddressBookBody');
  if (!container) return;
  container.innerHTML = '<div class="empty-state">加载中...</div>';

  const source = document.getElementById('knxAddressSourceFilter')?.value || '';
  const query = source ? `?source=${encodeURIComponent(source)}` : '';
  const result = await apiFetch(`/api/knx/address-book${query}`);
  const entries = result?.success ? result.data : [];
  state._knxAddressBook = entries;
  filterAddressBook();
}

function filterAddressBook() {
  const container = document.getElementById('knxAddressBookBody');
  if (!container) return;
  const keyword = (document.getElementById('knxAddressSearch')?.value || '').trim().toLowerCase();
  const entries = (state._knxAddressBook || []).filter((entry) => {
    if (!keyword) return true;
    return `${entry.address} ${entry.name || ''} ${entry.dpt || ''}`.toLowerCase().includes(keyword);
  });

  if (!entries.length) {
    container.innerHTML = '<div class="empty-state">暂无组地址记录</div>';
    return;
  }

  container.innerHTML = `
    <table class="knx-table">
      <thead><tr><th>地址</th><th>名称</th><th>DPT</th><th>来源</th><th>使用中</th><th>操作</th></tr></thead>
      <tbody>
        ${entries.map((entry) => `
          <tr>
            <td class="mono">${escapeHtml(entry.address)}</td>
            <td>${escapeHtml(entry.name || '--')}</td>
            <td>${escapeHtml(entry.dpt || '--')}</td>
            <td>${escapeHtml(entry.source || '--')}</td>
            <td>${entry.inUse ? '是' : '否'}</td>
            <td>
              <button class="btn-ghost-sm" onclick="editAddressBookEntry(${entry.id})">编辑</button>
              <button class="btn-ghost-sm" onclick="deleteAddressBookEntry(${entry.id})">删除</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function showAddressBookForm(entry) {
  const address = prompt('组地址 (如 1/0/1)', entry?.address || '');
  if (!address) return;
  const name = prompt('名称', entry?.name || '') || '';
  const dpt = prompt('DPT', entry?.dpt || '') || '';
  saveAddressBookEntry(entry?.id, { address, name, dpt });
}

async function editAddressBookEntry(id) {
  const entry = (state._knxAddressBook || []).find((e) => e.id === id);
  if (!entry) return;
  showAddressBookForm(entry);
}

async function saveAddressBookEntry(id, payload) {
  const result = id
    ? await apiFetch(`/api/knx/address-book/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    : await apiFetch('/api/knx/address-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

  if (result?.success) {
    showToast(id ? '地址已更新' : '地址已创建', 'success');
    await loadAddressBook();
  } else {
    showToast(result?.error || '保存失败', 'error');
  }
}

async function deleteAddressBookEntry(id) {
  if (!confirm('确定删除该组地址？')) return;
  const result = await apiFetch(`/api/knx/address-book/${id}`, { method: 'DELETE' });
  if (result?.success) {
    showToast('已删除', 'success');
    await loadAddressBook();
  } else {
    showToast(result?.error || '删除失败', 'error');
  }
}

async function loadKnxDevices() {
  const container = document.getElementById('knxDiscoverBody');
  if (!container) return;

  if (!state._selectedKnxProjectId) {
    const projectsResult = await apiFetch('/api/knx/ets/projects');
    const projects = projectsResult?.success ? projectsResult.data : [];
    state._knxProjects = projects;
    state._selectedKnxProjectId = projects[0]?.id || '';
  }

  if (!state._selectedKnxProjectId) {
    container.innerHTML = '<div class="empty-state">请先导入 ETS 项目</div>';
    return;
  }

  container.innerHTML = '<div class="empty-state">加载中...</div>';
  const result = await apiFetch(`/api/knx/ets/devices?projectId=${encodeURIComponent(state._selectedKnxProjectId)}`);
  const devices = result?.success ? result.data : [];

  if (!devices.length) {
    container.innerHTML = '<div class="empty-state">该项目未解析到物理设备</div>';
    return;
  }

  container.innerHTML = `
    <table class="knx-table">
      <thead><tr><th>个体地址</th><th>名称</th><th>产品</th><th>区域</th><th>线路</th><th>状态</th></tr></thead>
      <tbody>
        ${devices.map((device) => `
          <tr>
            <td class="mono">${escapeHtml(device.individualAddress)}</td>
            <td>${escapeHtml(device.name || '--')}</td>
            <td>${escapeHtml(device.product || '--')}</td>
            <td>${escapeHtml(device.area || '--')}</td>
            <td>${escapeHtml(device.line || '--')}</td>
            <td>${escapeHtml(device.importStatus || 'discovered')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadKnxdLogs() {
  const view = document.getElementById('knxdLogView');
  if (!view) return;
  view.textContent = '加载中...';
  const result = await apiFetch('/api/knxd/logs?lines=80');
  if (!result?.success) {
    view.textContent = '无法读取 knxd 日志';
    return;
  }
  view.textContent = result.data?.text || result.data?.error || '（无日志）';
}

function loadCoreStats(statusData, scenes = []) {
  const container = document.getElementById('fusionCoreGrid');
  if (!container) return;

  const metrics = statusData?.entityMetrics || {};
  const deviceCount = statusData?.deviceCount || metrics.entityCount || 0;
  const dbSize = statusData?.dbSize ? formatBytes(statusData.dbSize) : '0 B';
  const chatCount = statusData?.chatSessionCount || 0;
  const automationCount = statusData?.automationCount || 0;
  const sceneCount = statusData?.sceneCount ?? scenes.filter((s) => s.type === 'knx-scene').length;
  const knxScenes = scenes.filter((s) => s.type === 'knx-scene').length;
  const templateScenes = scenes.filter((s) => s.type !== 'knx-scene').length;
  const domainCount = metrics.domainCount || 0;
  const unavailableCount = metrics.unavailableCount || 0;
  const reportingCount = metrics.reportingCount ?? deviceCount;
  const connectedCollectors = statusData?.gateway?.connectedCollectors ?? 0;
  const collectorCount = statusData?.gateway?.collectorCount ?? 0;

  const cards = [
    {
      key: 'devices',
      title: '设备模型层',
      value: formatNumber(deviceCount),
      unit: '实体',
      icon: 'cpu',
      sub: 'HA/KNX 真实采集',
      stats: [`域 ${domainCount}`, `不可用 ${unavailableCount}`],
      details: [
        ['实体总数', deviceCount],
        ['设备域', domainCount],
        ['有状态反馈', reportingCount],
        ['不可用', unavailableCount],
        ['采集器', `${connectedCollectors}/${collectorCount} 已连接`],
      ],
    },
    {
      key: 'scenes',
      title: '场景引擎',
      value: formatNumber(sceneCount),
      unit: '个',
      icon: 'zap',
      sub: 'KNX + 模板',
      stats: [`KNX ${knxScenes}`, `模板 ${templateScenes}`],
      details: [['KNX 场景', knxScenes], ['模板场景', templateScenes], ['场景总数', sceneCount]],
    },
    {
      key: 'automations',
      title: '自动化引擎',
      value: formatNumber(automationCount),
      unit: '条',
      icon: 'activity',
      sub: '规则模板',
      stats: [`活跃告警 ${statusData?.activeAlerts || 0}`, `模板 ${automationCount}`],
      details: [['自动化模板', automationCount], ['活跃告警', statusData?.activeAlerts || 0]],
    },
    {
      key: 'events',
      title: '事件总线',
      value: formatNumber(statusData?.activeAlerts || 0),
      unit: '条',
      icon: 'database',
      sub: '活跃告警',
      stats: [`存储 ${dbSize}`, `AI 会话 ${chatCount}`],
      details: [
        ['数据库大小', dbSize],
        ['AI 会话', chatCount],
        ['服务运行', statusData?.uptime ? formatUptime(statusData.uptime) : '--'],
        ['CasaOS 主机运行', statusData?.gateway?.hostUptime ? formatUptime(statusData.gateway.hostUptime) : '--'],
      ],
    },
  ];

  container.innerHTML = cards.map((c, index) => `
    <div class="core-card" onclick="showCoreDetail(${index})">
      <div class="core-card-icon">${icon(c.icon)}</div>
      <div class="core-card-content">
        <div class="core-card-title">${c.title}</div>
        <div class="core-card-number">${c.value}${c.unit ? `<span style="font-size:14px;color:var(--text-tertiary);font-weight:500">${c.unit}</span>` : ''}</div>
        <div class="core-card-label">${c.sub}</div>
        <div class="core-card-stats">${c.stats.map((s) => `<span>${s}</span>`).join('')}</div>
      </div>
    </div>
  `).join('');
  state._fusionCoreCards = cards;
}

function showCoreDetail(index) {
  const card = state._fusionCoreCards?.[index];
  if (!card) return;
  showDetailModal(card.title, card.details);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function loadEcosystem(collectors) {
  const container = document.getElementById('ecosystemList');
  if (!container) return;

  if (!collectors || collectors.length === 0) {
    container.innerHTML = '<div class="trace-empty">暂无生态服务</div>';
    return;
  }

  const ecoMap = {
    'homeassistant': { name: 'Home Assistant', meta: '核心控制平台', icon: 'homeAssistant' },
    'ha': { name: 'Home Assistant', meta: '核心控制平台', icon: 'homeAssistant' },
    'nodered': { name: 'Node-RED', meta: '自动化编排', icon: 'zap' },
    'node-red': { name: 'Node-RED', meta: '自动化编排', icon: 'zap' },
    'matter': { name: 'Matter Hub', meta: '协议桥接', icon: 'matter' },
    'knx-gateway': { name: 'KNX 网关', meta: '总线接入', icon: 'knx' },
    'knx': { name: 'KNX 网关', meta: '总线接入', icon: 'knx' },
    'zigbee': { name: 'Zigbee 网关', meta: '无线网络', icon: 'zigbee' },
  };

  const ecosystems = collectors.map(c => {
    const eco = ecoMap[c.type] || { name: c.name, meta: c.type, icon: 'server' };
    const isOnline = c.status === 'connected' || c.status === 'online';
    return {
      name: eco.name,
      meta: eco.meta,
      baseUrl: c.baseUrl || '',
      icon: eco.icon,
      status: isOnline ? 'online' : (c.enabled ? 'pending' : 'offline'),
    };
  });

  container.innerHTML = ecosystems.map((e, index) => `
    <div class="ecosystem-item" onclick="showEcosystemDetail(${index})">
      <div class="eco-icon">${icon(e.icon)}</div>
      <div class="eco-info">
        <div class="eco-name">${escapeHtml(e.name)}</div>
        <div class="eco-meta">${escapeHtml(e.meta)}</div>
      </div>
      <div class="proto-status ${e.status}"></div>
    </div>
  `).join('');
  state._fusionEcosystems = ecosystems;
}

function showEcosystemDetail(index) {
  const eco = state._fusionEcosystems?.[index];
  if (!eco) return;
  showDetailModal(`${eco.name} 服务详情`, [
    ['服务类型', eco.meta],
    ['连接地址', eco.baseUrl || '未配置'],
    ['连接状态', eco.status === 'online' ? '已连接' : eco.status === 'pending' ? '连接中' : '离线'],
  ]);
}

/* ============================================================
   AI Chat Page
   ============================================================ */

function initChat() {
  const input = document.getElementById('chatInput');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (state.chatMessages.length === 0) {
    state.chatMessages.push({
      role: 'assistant',
      content: '我是您的 AI 安全管家，已接入您的智能家居系统。我可以帮助您：\n\n- 检测安全隐患并提供解决方案\n- 分析设备状态和能耗数据\n- 创建自动化场景\n- 回答关于智能家居的任何问题\n\n请问有什么可以帮您的？',
    });
  }

  renderChat();
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || state.isChatLoading) return;

  state.chatMessages.push({ role: 'user', content: text });
  input.value = '';
  state.isChatLoading = true;
  renderChat();

  apiFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: text }),
  }).then((result) => {
    state.isChatLoading = false;
    if (result.success && result.data) {
      const reply = result.data.reply || result.data.message || '已收到回复';
      state.chatMessages.push({ role: 'assistant', content: reply });
    } else {
      state.chatMessages.push({
        role: 'assistant',
        content: `抱歉，AI 暂时无法响应：${result.error || '未知错误'}。请检查系统设置中的 AI 配置。`,
      });
    }
    renderChat();
  }).catch((error) => {
    state.isChatLoading = false;
    state.chatMessages.push({
      role: 'assistant',
      content: `请求失败：${error.message}`,
    });
    renderChat();
  });
}

function renderChat() {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  let html = state.chatMessages.map(msg => `
    <div class="message message-${msg.role}">
      <div class="msg-avatar">
        ${msg.role === 'assistant' ? icon('sparkles') : icon('user')}
      </div>
      <div class="msg-bubble">
        <div class="msg-sender">${msg.role === 'assistant' ? 'AI 安全管家' : '我'}</div>
        <div class="msg-content">${formatChatContent(msg.content)}</div>
      </div>
    </div>
  `).join('');

  if (state.isChatLoading) {
    html += `
      <div class="message message-assistant">
        <div class="msg-avatar">
          ${icon('sparkles')}
        </div>
        <div class="msg-bubble">
          <div class="msg-sender">AI 安全管家</div>
          <div class="msg-content"><p>正在思考...</p></div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function formatChatContent(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const withLineBreaks = escaped.replace(/\n/g, '<br>');
  return `<p>${withLineBreaks}</p>`;
}

function sendQuickSuggestion(text) {
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = text;
    sendMessage();
  }
}

function sendChatMessage() {
  sendMessage();
}

function quickChat(text) {
  sendQuickSuggestion(text);
}

function newChat() {
  apiFetch('/api/chat/clear', { method: 'POST' }).finally(() => {
    state.chatMessages = [];
    initChat();
    showToast('已开始新对话', 'info');
  });
}

function showPage(page) {
  navigateTo(page);
}

function fetchData() {
  if (state.currentPage === 'overview') {
    showToast('正在刷新数据...', 'info');
    loadOverviewData();
    setTimeout(() => {
      showToast('数据已刷新', 'success');
    }, 500);
  }
}

function runDetection() {
  apiFetch('/api/detect', { method: 'POST' }).then(() => {
    showToast('安全检测已启动', 'success');
    setTimeout(() => loadAlerts(), 2000);
  }).catch(() => {
    showToast('检测启动失败', 'error');
  });
}

/* ============================================================
   Diagnostics Page
   ============================================================ */

async function loadDiagnostics() {
  const [statusResult, collectorsResult] = await Promise.all([
    apiFetch('/api/status'),
    apiFetch('/api/collectors'),
  ]);
  const statusData = statusResult && statusResult.success ? statusResult.data : null;
  const collectors = collectorsResult && collectorsResult.success && collectorsResult.data ? collectorsResult.data : [];

  loadSystemInfo(statusData);
  loadCollectorStatus(collectors);
  loadKnxdLogs();
}

function loadSystemInfo(statusData) {
  const uptimeEl = document.getElementById('diagUptime');
  const cpuEl = document.getElementById('diagCpu');
  const memEl = document.getElementById('diagMem');
  const dbEl = document.getElementById('diagDb');

  if (uptimeEl) uptimeEl.textContent = statusData?.uptime ? formatUptime(statusData.uptime) : '--';
  if (cpuEl) cpuEl.textContent = statusData?.system?.cpuUsage != null ? statusData.system.cpuUsage + '%' : '--';

  if (memEl && statusData?.system) {
    const memUsed = formatBytes(statusData.system.memoryUsed || 0);
    const memTotal = formatBytes(statusData.system.memoryTotal || 0);
    memEl.textContent = `${memUsed} / ${memTotal}`;
  } else if (memEl) {
    memEl.textContent = '--';
  }

  if (dbEl) dbEl.textContent = statusData?.dbSize ? formatBytes(statusData.dbSize) : '--';
}

function loadCollectorStatus(collectors) {
  const haEl = document.getElementById('diagHa');
  const nrEl = document.getElementById('diagNr');

  if (haEl) {
    const ha = collectors.find(c => c.type === 'homeassistant');
    if (ha) {
      const isOnline = ha.status === 'connected' || ha.status === 'online';
      haEl.textContent = isOnline ? '已连接' : (ha.enabled ? '连接中' : '未配置');
      haEl.className = 'status-pill status-' + (isOnline ? 'success' : (ha.enabled ? 'pending' : 'disabled'));
    }
  }

  if (nrEl) {
    const nr = collectors.find(c => c.type === 'nodered');
    if (nr) {
      const isOnline = nr.status === 'connected' || nr.status === 'online';
      nrEl.textContent = isOnline ? '已连接' : (nr.enabled ? '连接中' : '未配置');
      nrEl.className = 'status-pill status-' + (isOnline ? 'success' : (nr.enabled ? 'pending' : 'disabled'));
    }
  }

  const knxdEl = document.getElementById('diagKnxd');
  if (knxdEl) {
    const knxd = collectors.find(c => c.type === 'knxd');
    if (knxd) {
      const isOnline = knxd.status === 'connected' || knxd.status === 'online';
      knxdEl.textContent = isOnline ? '已连接' : (knxd.enabled ? '连接中' : '未配置');
      knxdEl.className = 'status-pill status-' + (isOnline ? 'success' : (knxd.enabled ? 'pending' : 'disabled'));
    }
  }
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h} 小时 ${m} 分`;
}

function rerunDiagnostics() {
  showToast('正在重新检测系统状态...', 'info');
  loadDiagnostics();
  setTimeout(() => {
    showToast('系统检测完成', 'success');
  }, 1000);
}

function handleAlertAction(alertId) {
  if (!alertId) {
    showToast('告警 ID 无效', 'error');
    return;
  }
  acknowledgeAlert(alertId);
}

/* ============================================================
   Settings Page
   ============================================================ */

async function loadSettings() {
  const result = await apiFetch('/api/settings');
  state.settings = result && result.success ? result.data : getDefaultSettings();
  renderSettings();
}

function getDefaultSettings() {
  return {
    collectors: [
      { id: 'homeassistant', name: 'Home Assistant', type: 'homeassistant', enabled: true, baseUrl: 'http://172.17.0.1:8123', token: '' },
      { id: 'node-red', name: 'Node-RED', type: 'nodered', enabled: true, baseUrl: 'http://172.17.0.1:1880', token: '' },
      { id: 'matter-hub', name: 'Matter Hub', type: 'matter', enabled: false, baseUrl: 'http://172.17.0.1:5580', token: '' },
      { id: 'knx-gateway', name: 'KNX 网关 1', type: 'knx-gateway', enabled: false, baseUrl: '', token: '' },
      { id: 'knx-gateway-2', name: 'KNX 网关 2', type: 'knx-gateway', enabled: false, baseUrl: '', token: '' },
    ],
    ai: {
      provider: 'openrouter',
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      fallbackModel: 'openrouter/free',
      apiKey: '',
    },
    notifications: {
      telegram: {
        enabled: false,
        botToken: '',
        chatId: '',
      },
      bark: {
        enabled: false,
        deviceKey: '',
        baseUrl: 'https://api.day.app',
        sound: 'minuet',
        icon: '',
        group: '',
      },
      serverchan: {
        enabled: false,
        sendKey: '',
        channel: '',
        openid: '',
      },
    },
    system: {
      detectionInterval: 300,
      logRetentionDays: 30,
      theme: 'dark',
    },
  };
}

function renderSettings() {
  const container = document.getElementById('settingsContent');
  if (!container || !state.settings) return;

  const collectorsHtml = state.settings.collectors.map(c => `
    <div class="collector-card">
      <div class="collector-card-header">
        <div class="collector-icon">${icon(getCollectorIcon(c.type))}</div>
        <div class="collector-info">
          <div class="collector-name">${c.name}</div>
          <div class="collector-type">${getCollectorTypeLabel(c.type)}</div>
        </div>
        <div class="toggle-switch ${c.enabled ? 'active' : ''}" onclick="toggleCollector('${c.id}')"></div>
      </div>
      <div class="collector-card-body">
        <div class="form-row">
          <div class="form-group">
            <label>服务地址</label>
            <div class="input-with-btn">
              <input type="text" class="form-input" value="${escapeHtml(c.baseUrl)}" id="url-${c.id}" placeholder="http://...">
              <button class="btn-test" onclick="testConnection('${c.id}')">测试</button>
            </div>
          </div>
          <div class="form-group">
            <label>API Token</label>
            <input type="password" class="form-input" value="${escapeHtml(c.token || '')}" id="token-${c.id}" placeholder="输入访问令牌">
          </div>
        </div>
        <div class="collector-status-text" id="status-${c.id}" style="color: ${c.enabled ? 'var(--accent-success)' : 'var(--text-tertiary)'}">
          ${c.enabled ? '已启用' : '未启用'}
        </div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="settings-section">
      <div class="settings-section-header">
        <h3>数据源配置</h3>
        <p>配置 Home Assistant、Node-RED、KNX 网关等数据源，默认连接 CasaOS 本机容器</p>
      </div>
      <div class="collectors-grid">
        ${collectorsHtml}
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-header">
        <h3>AI 模型配置</h3>
        <p>配置大语言模型 API，用于智能分析和对话</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>AI 提供商</label>
              <select class="form-input" id="ai-provider">
                <option value="openrouter" ${state.settings.ai.provider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
              </select>
            </div>
            <div class="form-group">
              <label>主模型</label>
              <select class="form-input" id="ai-model">
                ${AI_MODELS.map(m => `<option value="${escapeHtml(m.value)}" ${state.settings.ai.model === m.value ? 'selected' : ''}>${escapeHtml(m.label)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>备用模型</label>
              <select class="form-input" id="ai-fallbackModel">
                <option value="">无</option>
                ${AI_MODELS.map(m => `<option value="${escapeHtml(m.value)}" ${state.settings.ai.fallbackModel === m.value ? 'selected' : ''}>${escapeHtml(m.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>API Key</label>
              <input type="password" class="form-input" id="ai-apiKey" value="${escapeHtml(state.settings.ai.apiKey || '')}" placeholder="sk-or-v1-...">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>连接状态</label>
              <div class="input-with-btn">
                <input type="text" class="form-input" id="ai-status" value="未测试" readonly>
                <button class="btn-test" onclick="testAIConnection()">测试连接</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-header">
        <h3>通知渠道</h3>
        <p>配置告警通知方式，及时接收安全提醒</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div class="toggle-switch ${state.settings.notifications.telegram.enabled ? 'active' : ''}" onclick="toggleTelegram()"></div>
                  <span>Telegram 通知</span>
                </div>
              </label>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Bot Token</label>
              <input type="password" class="form-input" id="telegram-botToken" value="${escapeHtml(state.settings.notifications.telegram.botToken || '')}" placeholder="Bot Token">
            </div>
            <div class="form-group">
              <label>Chat ID</label>
              <input type="text" class="form-input" id="telegram-chatId" value="${escapeHtml(state.settings.notifications.telegram.chatId || '')}" placeholder="Chat ID">
            </div>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <button class="btn btn-secondary" onclick="testNotification('telegram')" style="width:100%;">测试 Telegram 推送</button>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:16px;">
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div class="toggle-switch ${state.settings.notifications.bark.enabled ? 'active' : ''}" onclick="toggleBark()"></div>
                  <span>Bark 通知 (iOS)</span>
                </div>
              </label>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>设备密钥 (Device Key)</label>
              <input type="password" class="form-input" id="bark-deviceKey" value="${escapeHtml(state.settings.notifications.bark.deviceKey || '')}" placeholder="Bark 设备密钥">
            </div>
            <div class="form-group">
              <label>服务地址 (Base URL)</label>
              <input type="text" class="form-input" id="bark-baseUrl" value="${escapeHtml(state.settings.notifications.bark.baseUrl || 'https://api.day.app')}" placeholder="https://api.day.app">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>铃声</label>
              <input type="text" class="form-input" id="bark-sound" value="${escapeHtml(state.settings.notifications.bark.sound || 'minuet')}" placeholder="minuet">
            </div>
            <div class="form-group">
              <label>分组</label>
              <input type="text" class="form-input" id="bark-group" value="${escapeHtml(state.settings.notifications.bark.group || '')}" placeholder="通知分组">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>图标 URL</label>
              <input type="text" class="form-input" id="bark-icon" value="${escapeHtml(state.settings.notifications.bark.icon || '')}" placeholder="图标 URL (可选)">
            </div>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <button class="btn btn-secondary" onclick="testNotification('bark')" style="width:100%;">测试 Bark 推送</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div class="toggle-switch ${state.settings.notifications.serverchan.enabled ? 'active' : ''}" onclick="toggleServerchan()"></div>
                  <span>Server酱 通知 (微信)</span>
                </div>
              </label>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>SendKey</label>
              <input type="password" class="form-input" id="serverchan-sendKey" value="${escapeHtml(state.settings.notifications.serverchan.sendKey || '')}" placeholder="Server酱 SendKey">
            </div>
            <div class="form-group">
              <label>推送通道 (可选)</label>
              <input type="text" class="form-input" id="serverchan-channel" value="${escapeHtml(state.settings.notifications.serverchan.channel || '')}" placeholder="通道编号">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>指定用户 openid (可选)</label>
              <input type="text" class="form-input" id="serverchan-openid" value="${escapeHtml(state.settings.notifications.serverchan.openid || '')}" placeholder="openid">
            </div>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <button class="btn btn-secondary" onclick="testNotification('serverchan')" style="width:100%;">测试 Server酱 推送</button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-header">
        <h3>系统设置</h3>
        <p>配置检测间隔、日志保留等系统参数</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>安全检测间隔（秒）</label>
              <input type="number" class="form-input" id="system-detectionInterval" value="${state.settings.system.detectionInterval}" min="60" step="60">
            </div>
            <div class="form-group">
              <label>日志保留天数</label>
              <input type="number" class="form-input" id="system-logRetentionDays" value="${state.settings.system.logRetentionDays}" min="1" max="365">
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function getCollectorIcon(type) {
  const map = {
    homeassistant: 'homeAssistant',
    'knx-gateway': 'knx',
    nodered: 'server',
    matter: 'matter',
    zigbee: 'zigbee',
  };
  return map[type] || 'cpu';
}

function getCollectorTypeLabel(type) {
  const map = {
    homeassistant: 'Home Assistant 集成',
    'knx-gateway': 'KNX 总线网关',
    nodered: 'Node-RED 流处理',
    matter: 'Matter 协议桥接',
    zigbee: 'Zigbee 3.0',
  };
  return map[type] || type;
}

function toggleCollector(id) {
  if (!state.settings) return;
  const collector = state.settings.collectors.find(c => c.id === id);
  if (collector) {
    collector.enabled = !collector.enabled;
    renderSettings();
    showToast(`${collector.name} 已${collector.enabled ? '启用' : '禁用'}`, 'info');
  }
}

function toggleTelegram() {
  if (!state.settings) return;
  state.settings.notifications.telegram.enabled = !state.settings.notifications.telegram.enabled;
  renderSettings();
  showToast(`Telegram 通知已${state.settings.notifications.telegram.enabled ? '启用' : '禁用'}`, 'info');
}

function toggleBark() {
  if (!state.settings) return;
  state.settings.notifications.bark.enabled = !state.settings.notifications.bark.enabled;
  renderSettings();
  showToast(`Bark 通知已${state.settings.notifications.bark.enabled ? '启用' : '禁用'}`, 'info');
}

function toggleServerchan() {
  if (!state.settings) return;
  state.settings.notifications.serverchan.enabled = !state.settings.notifications.serverchan.enabled;
  renderSettings();
  showToast(`Server酱 通知已${state.settings.notifications.serverchan.enabled ? '启用' : '禁用'}`, 'info');
}

async function testNotification(channel) {
  if (!state.settings) return;

  const channelNames = {
    telegram: 'Telegram',
    bark: 'Bark',
    serverchan: 'Server酱',
  };
  const name = channelNames[channel] || channel;

  showToast(`正在测试 ${name} 推送...`, 'info');

  let config = {};
  if (channel === 'telegram') {
    const botToken = document.getElementById('telegram-botToken')?.value || state.settings.notifications.telegram.botToken;
    const chatId = document.getElementById('telegram-chatId')?.value || state.settings.notifications.telegram.chatId;
    config = { botToken, chatId };
  } else if (channel === 'bark') {
    const deviceKey = document.getElementById('bark-deviceKey')?.value || state.settings.notifications.bark.deviceKey;
    const baseUrl = document.getElementById('bark-baseUrl')?.value || state.settings.notifications.bark.baseUrl;
    const sound = document.getElementById('bark-sound')?.value || state.settings.notifications.bark.sound;
    const group = document.getElementById('bark-group')?.value || state.settings.notifications.bark.group;
    const icon = document.getElementById('bark-icon')?.value || state.settings.notifications.bark.icon;
    config = { deviceKey, baseUrl, sound, group, icon };
  } else if (channel === 'serverchan') {
    const sendKey = document.getElementById('serverchan-sendKey')?.value || state.settings.notifications.serverchan.sendKey;
    const channel = document.getElementById('serverchan-channel')?.value || state.settings.notifications.serverchan.channel;
    const openid = document.getElementById('serverchan-openid')?.value || state.settings.notifications.serverchan.openid;
    config = { sendKey, channel, openid };
  }

  try {
    const res = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, config }),
    });
    const data = await res.json();

    if (data.success) {
      showToast(`${name} 推送测试成功！耗时 ${data.latencyMs}ms`, 'success');
    } else {
      showToast(`${name} 推送测试失败：${data.error || '未知错误'}`, 'error');
    }
  } catch (err) {
    showToast(`${name} 推送测试失败：${err.message}`, 'error');
  }
}

async function testConnection(id) {
  const statusEl = document.getElementById(`status-${id}`);
  const collector = state.settings.collectors.find(c => c.id === id);
  if (!collector || !statusEl) return;

  const baseUrl = document.getElementById(`url-${id}`).value;
  const token = document.getElementById(`token-${id}`).value;

  statusEl.style.color = 'var(--accent-warning)';
  statusEl.textContent = '正在测试连接...';

  try {
    const result = await apiFetch('/api/collectors/test', {
      method: 'POST',
      body: JSON.stringify({ type: collector.type, baseUrl, token }),
    });

    if (result.success && result.data && result.data.success) {
      statusEl.style.color = 'var(--accent-success)';
      statusEl.textContent = `连接成功，延迟 ${result.data.latency || '?'}ms`;
      showToast('连接测试成功', 'success');
    } else {
      statusEl.style.color = 'var(--accent-danger)';
      statusEl.textContent = result.data?.message || '连接失败';
      showToast('连接测试失败', 'error');
    }
  } catch (e) {
    statusEl.style.color = 'var(--accent-danger)';
    statusEl.textContent = '连接失败：' + e.message;
    showToast('连接测试失败', 'error');
  }
}

async function testAIConnection() {
  const statusEl = document.getElementById('ai-status');
  if (!statusEl) return;

  const apiKey = document.getElementById('ai-apiKey')?.value || '';
  const model = document.getElementById('ai-model')?.value || '';

  if (!apiKey) {
    showToast('请先输入 API Key', 'warning');
    return;
  }

  statusEl.value = '正在测试连接...';
  statusEl.style.color = 'var(--accent-warning)';

  try {
    const result = await apiFetch('/api/ai/test', {
      method: 'POST',
      body: JSON.stringify({ provider: 'openrouter', model, apiKey }),
    });

    if (result && result.success) {
      statusEl.value = '连接成功';
      statusEl.style.color = 'var(--accent-success)';
      showToast('AI 连接测试成功', 'success');
    } else {
      statusEl.value = '连接失败';
      statusEl.style.color = 'var(--accent-danger)';
      showToast('AI 连接测试失败：' + (result?.error || '未知错误'), 'error');
    }
  } catch (e) {
    statusEl.value = '连接失败：' + e.message;
    statusEl.style.color = 'var(--accent-danger)';
    showToast('AI 连接测试失败', 'error');
  }
}

async function saveSettings() {
  if (!state.settings) return;

  for (const collector of state.settings.collectors) {
    const urlEl = document.getElementById(`url-${collector.id}`);
    const tokenEl = document.getElementById(`token-${collector.id}`);
    if (urlEl) collector.baseUrl = urlEl.value;
    if (tokenEl) collector.token = tokenEl.value;
  }

  const aiProvider = document.getElementById('ai-provider');
  const aiModel = document.getElementById('ai-model');
  const aiFallback = document.getElementById('ai-fallbackModel');
  const aiKey = document.getElementById('ai-apiKey');
  if (aiProvider) state.settings.ai.provider = aiProvider.value;
  if (aiModel) state.settings.ai.model = aiModel.value;
  if (aiFallback) state.settings.ai.fallbackModel = aiFallback.value;
  if (aiKey) state.settings.ai.apiKey = aiKey.value;

  const tgBot = document.getElementById('telegram-botToken');
  const tgChat = document.getElementById('telegram-chatId');
  if (tgBot) state.settings.notifications.telegram.botToken = tgBot.value;
  if (tgChat) state.settings.notifications.telegram.chatId = tgChat.value;

  const barkDeviceKey = document.getElementById('bark-deviceKey');
  const barkBaseUrl = document.getElementById('bark-baseUrl');
  const barkSound = document.getElementById('bark-sound');
  const barkGroup = document.getElementById('bark-group');
  const barkIcon = document.getElementById('bark-icon');
  if (barkDeviceKey) state.settings.notifications.bark.deviceKey = barkDeviceKey.value;
  if (barkBaseUrl) state.settings.notifications.bark.baseUrl = barkBaseUrl.value;
  if (barkSound) state.settings.notifications.bark.sound = barkSound.value;
  if (barkGroup) state.settings.notifications.bark.group = barkGroup.value;
  if (barkIcon) state.settings.notifications.bark.icon = barkIcon.value;

  const scSendKey = document.getElementById('serverchan-sendKey');
  const scChannel = document.getElementById('serverchan-channel');
  const scOpenid = document.getElementById('serverchan-openid');
  if (scSendKey) state.settings.notifications.serverchan.sendKey = scSendKey.value;
  if (scChannel) state.settings.notifications.serverchan.channel = scChannel.value;
  if (scOpenid) state.settings.notifications.serverchan.openid = scOpenid.value;

  const detInterval = document.getElementById('system-detectionInterval');
  const logDays = document.getElementById('system-logRetentionDays');
  if (detInterval) state.settings.system.detectionInterval = parseInt(detInterval.value, 10);
  if (logDays) state.settings.system.logRetentionDays = parseInt(logDays.value, 10);

  const result = await apiFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(state.settings),
  });

  if (result.success) {
    showToast(result.message || '设置已保存并立即生效', 'success');
  } else {
    showToast('保存失败：' + (result.error || '未知错误'), 'error');
  }
}

function resetSettings() {
  if (confirm('确定要重置所有设置为默认值吗？')) {
    state.settings = getDefaultSettings();
    renderSettings();
    showToast('设置已重置为默认值', 'info');
  }
}

/* ============================================================
   Initialization
   ============================================================ */

function init() {
  if (state.initialized) return;
  state.initialized = true;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page) navigateTo(page);
    });
  });

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) toggleView(view);
    });
  });

  document.addEventListener('click', () => closeAllPopovers());

  initRoomTabs();
  initOverviewTabs();
  applyLayoutPreferences();

  const deviceSearch = document.getElementById('deviceSearch');
  const deviceFilter = document.getElementById('deviceFilter');
  if (deviceSearch) deviceSearch.addEventListener('input', renderDeviceTable);
  if (deviceFilter) deviceFilter.addEventListener('change', renderDeviceTable);

  loadRoomScenes();
  initChat();
  loadChatHistory();
  updateTopbarStatus();

  updateGatewayStatus();

  const hashPage = (location.hash || '').replace(/^#\/?/, '');
  const allowedPages = ['overview', 'spaces', 'scenes', 'devices', 'security', 'fusion', 'knx', 'diagnostics', 'settings', 'ai'];
  const initialPage = allowedPages.includes(hashPage) ? hashPage : 'overview';
  navigateTo(initialPage);

  const traceInterval = setInterval(() => {
    if (state.currentPage === 'overview') {
      loadTraces();
    }
  }, 10000);
  state.intervals.push(traceInterval);

  const gatewayInterval = setInterval(() => {
    updateGatewayStatus();
    updateTopbarStatus();
  }, 5000);
  state.intervals.push(gatewayInterval);

  console.log('Security Butler Nexus initialized');
}

async function updateGatewayStatus() {
  const cpuEl = document.getElementById('sidebarCpu');
  const memEl = document.getElementById('sidebarMem');
  const devEl = document.getElementById('sidebarDevices');
  const nameEl = document.getElementById('sidebarGatewayName');
  const idEl = document.getElementById('sidebarGatewayId');

  const result = await apiFetch('/api/status');
  const data = result && result.success ? result.data : null;
  const gateway = data?.gateway || null;

  if (gateway) {
    if (cpuEl) cpuEl.textContent = (gateway.cpuUsage != null ? gateway.cpuUsage + '%' : '--');
    if (memEl) memEl.textContent = (gateway.memoryUsage != null ? gateway.memoryUsage + '%' : '--');
    if (devEl) devEl.textContent = (gateway.deviceCount != null ? gateway.deviceCount : '--');
    if (nameEl) nameEl.textContent = 'CasaOS 安全管家';
    if (idEl) {
      const collectors = gateway.connectedCollectors != null ? `${gateway.connectedCollectors}/${gateway.collectorCount} 采集器` : '';
      idEl.textContent = collectors || gateway.platform || gateway.hostname || '--';
    }
  }

  const fusionScore = document.getElementById('fusionHealthScore');
  if (fusionScore && gateway?.connectedCollectors != null) {
    fusionScore.textContent = `${gateway.connectedCollectors}/${gateway.collectorCount} 采集器在线`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
