// Sunroom section-library styles. Theme via --sr-* custom properties; every
// value carries a fallback so unthemed consumers still render. Injected once
// by the server Sections render engine (see render/sections.tsx).
export const SECTIONS_CSS = `
.srs-label{font-family:var(--sr-font-label,ui-monospace,monospace);text-transform:uppercase;letter-spacing:.12em;font-size:.8rem;color:var(--sr-muted,#a98a7e);}

.srs-gallery{margin:4rem 0;}
.srs-gallery .srs-label{margin:0 0 1.25rem;}
.srs-gallery-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.75rem;}
.srs-gallery-cell{margin:0;}
.srs-gallery-tile{display:block;width:100%;padding:0;border:0;background:none;cursor:pointer;border-radius:8px;overflow:hidden;}
.srs-gallery-frame{display:block;aspect-ratio:1/1;overflow:hidden;}
.srs-gallery-thumb{width:100%;height:100%;object-fit:cover;display:block;}
.srs-gallery-tile:hover .srs-gallery-thumb{opacity:.9;}
.srs-lightbox{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.85);padding:4vh 4vw;}
.srs-lightbox-img{max-width:92vw;max-height:82vh;width:auto;height:auto;object-fit:contain;border-radius:6px;}
.srs-lightbox-close{position:absolute;top:1rem;right:1rem;background:none;border:0;color:var(--sr-text,#f3e7e1);font-size:1.6rem;line-height:1;cursor:pointer;}
.srs-lightbox-nav{position:absolute;top:50%;transform:translateY(-50%);width:3rem;height:3rem;border-radius:50%;border:0;background:rgba(0,0,0,.4);color:var(--sr-text,#f3e7e1);font-size:2.2rem;line-height:1;cursor:pointer;}
.srs-lightbox-nav:disabled{opacity:.3;cursor:default;}
.srs-lightbox-prev{left:1rem;}
.srs-lightbox-next{right:1rem;}
@media (max-width:460px){.srs-gallery-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));}}

.srs-hero{margin:3rem 0;}
.srs-hero .srs-label{text-align:center;margin:0 0 1.25rem;}
.srs-hero-frame{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;}
.srs-hero-overlay{position:absolute;left:0;right:0;bottom:1.25rem;text-align:center;margin:0;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.55);}
.srs-hero-img{width:100%;height:100%;object-fit:cover;}
`;
