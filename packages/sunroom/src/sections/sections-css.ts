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

.srs-cta{display:grid;place-items:center;margin:5rem 0;}
.srs-cta-btn{font-family:var(--sr-font-label,ui-monospace,monospace);text-transform:uppercase;letter-spacing:.14em;font-size:.95rem;cursor:pointer;text-decoration:none;padding:1.1rem 2.5rem;background:var(--sr-text,#f3e7e1);color:var(--sr-bg,#181210);border:0;}
.srs-cta-btn:hover{background:var(--sr-accent,#ff6f52);color:var(--sr-on-accent,#2a0f08);}

.srs-creditsgrid{margin:4rem 0;}
.srs-creditsgrid .srs-label{margin:0 0 1.5rem;}
.srs-creditsgrid-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:2rem 1.75rem;}
.srs-creditsgrid-card{margin:0;}
.srs-creditsgrid-frame{aspect-ratio:1/1;overflow:hidden;margin-bottom:.75rem;}
.srs-creditsgrid-cover{width:100%;height:100%;object-fit:cover;}
.srs-creditsgrid-band{font-family:var(--sr-font-heading,Georgia,serif);font-weight:600;font-size:1.05rem;margin:0;}
.srs-creditsgrid-release{font-family:var(--sr-font-heading,Georgia,serif);font-style:italic;color:var(--sr-muted,#a98a7e);margin:.1rem 0 0;}
@media (max-width:720px){.srs-creditsgrid-grid{grid-template-columns:repeat(2,1fr);}}
@media (max-width:460px){.srs-creditsgrid-grid{grid-template-columns:1fr;}}

.srs-discography{margin:4rem 0;}
.srs-discography .srs-label{margin:0 0 1.25rem;}
.srs-discography-list{list-style:none;margin:0;padding:0;columns:2;column-gap:3rem;}
.srs-discography-item{font-family:var(--sr-font-heading,Georgia,serif);padding:.35rem 0;break-inside:avoid;color:var(--sr-muted,#a98a7e);}
.srs-discography-link{color:var(--sr-text,#f3e7e1);text-decoration:none;border-bottom:1px solid var(--sr-border,#3a2820);}
.srs-discography-link:hover{color:var(--sr-accent,#ff6f52);border-color:var(--sr-accent,#ff6f52);}
@media (max-width:560px){.srs-discography-list{columns:1;}}

.srs-carousel{margin:4rem 0;}
.srs-carousel-viewport{position:relative;}
.srs-carousel-btn{font:inherit;cursor:pointer;width:2.25rem;height:2.25rem;border-radius:50%;border:1px solid var(--sr-border,#3a2820);color:var(--sr-muted,#a98a7e);position:absolute;top:50%;transform:translateY(-50%);z-index:2;background:var(--sr-bg,#181210);}
.srs-carousel-btn:hover{color:var(--sr-text,#f3e7e1);border-color:var(--sr-muted,#a98a7e);}
.srs-carousel-prev{left:-.5rem;}
.srs-carousel-next{right:-.5rem;}
.srs-carousel-track{list-style:none;margin-top:1.25rem;padding:0 0 .5rem;display:flex;gap:1.25rem;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;outline:none;}
.srs-carousel-track:focus-visible{outline:2px solid var(--sr-accent,#ff6f52);outline-offset:2px;}
.srs-carousel-track::-webkit-scrollbar{display:none;}
.srs-carousel-slide{flex:0 0 300px;scroll-snap-align:start;}
.srs-carousel-frame{aspect-ratio:4/3;overflow:hidden;border-radius:10px;margin-bottom:.75rem;}
.srs-carousel-img{width:100%;height:100%;object-fit:cover;}
.srs-carousel-name{font-family:var(--sr-font-heading,Georgia,serif);font-weight:600;margin:0;}
.srs-carousel-note{color:var(--sr-muted,#a98a7e);margin:.15rem 0 0;font-size:.95rem;}
@media (max-width:460px){.srs-carousel-slide{flex-basis:78vw;}.srs-carousel-prev{left:0;}.srs-carousel-next{right:0;}}

.srs-embed{margin:4rem 0;}
.srs-embed .srs-label{margin:0 0 1.25rem;}
.srs-embed-frame{width:100%;}
.srs-embed-iframe{width:100%;height:400px;border:0;border-radius:12px;background:var(--sr-surface,#2c1e1a);}

.srs-prose{margin:4rem 0;}
.srs-prose.srs-prose-rail{display:grid;grid-template-columns:1fr;gap:3rem;}
@media (min-width:820px){.srs-prose.srs-prose-rail{grid-template-columns:1.7fr 1fr;}}
.srs-prose-main{max-width:40rem;}
.srs-prose-body{font-family:var(--sr-font-prose,Georgia,serif);font-size:1.15rem;}
.srs-prose-body p{margin:0 0 1.25rem;}
.srs-prose-body em{font-style:italic;}
.srs-prose-rail-aside{border-top:1px solid var(--sr-border,#3a2820);padding-top:1.5rem;}
.srs-prose-blurb{color:var(--sr-muted,#a98a7e);margin:0 0 1.25rem;}
.srs-prose-cta{display:inline-block;font-family:var(--sr-font-label,ui-monospace,monospace);text-transform:uppercase;letter-spacing:.12em;font-size:.85rem;padding:.75rem 1.25rem;background:var(--sr-text,#f3e7e1);color:var(--sr-bg,#181210);text-decoration:none;margin-bottom:2rem;border:0;cursor:pointer;}
.srs-prose-rail-aside .srs-label{margin:0 0 .5rem;}
.srs-prose-booking{color:var(--sr-muted,#a98a7e);}
.srs-prose-booking a{color:var(--sr-accent,#ff6f52);}
`;
