// Sunroom section-library styles. Theme via --sr-* custom properties; every
// value carries a fallback so unthemed consumers still render. Injected once
// by the server Sections render engine (see render/sections.tsx).
export const SECTIONS_CSS = `
.srs-label{font-family:var(--sr-font-label,ui-monospace,monospace);text-transform:uppercase;letter-spacing:.12em;font-size:.8rem;color:var(--sr-muted,#a98a7e);}
`;
