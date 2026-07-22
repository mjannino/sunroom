export const ADMIN_CSS = `
.sr-admin {
  --sr-bg:#181210; --sr-surface:#221814; --sr-surface-2:#2c1e1a; --sr-surface-3:#342420;
  --sr-border:#3a2820; --sr-text:#f3e7e1; --sr-muted:#a98a7e; --sr-faint:#6f5a51;
  --sr-accent:#ff6f52; --sr-accent-hi:#ff8b6f; --sr-accent-soft:#ff9d7a; --sr-on-accent:#2a0f08;
  /* rgb triplets for rgba() so translucent accent/shadow tints stay on-token */
  --sr-accent-rgb:255,111,82; --sr-on-accent-rgb:42,15,8; --sr-bg-rgb:24,18,16;
  background:var(--sr-bg); color:var(--sr-text);
  font-family:system-ui,-apple-system,sans-serif; min-height:100vh;
}
.sr-admin *{box-sizing:border-box;}
.sr-admin a{color:var(--sr-accent-soft);text-decoration:none;}
.sr-admin button{font:inherit;cursor:pointer;}

/* top bar */
.sr-top{display:flex;align-items:center;gap:12px;padding:11px 18px;
  background:var(--sr-surface);border-bottom:1px solid var(--sr-border);}
.sr-brand{display:flex;align-items:center;gap:9px;font-weight:700;letter-spacing:.02em;color:var(--sr-text);}
.sr-sun{width:17px;height:17px;border-radius:50%;
  background:radial-gradient(circle at 35% 35%,#ffd0a3,rgb(var(--sr-accent-rgb)) 70%);
  box-shadow:0 0 10px rgba(var(--sr-accent-rgb),.5);}
.sr-top-spacer{flex:1;}
.sr-user{font-size:12px;color:var(--sr-muted);}

/* body split */
.sr-body{display:flex;align-items:stretch;min-height:calc(100vh - 45px);}
.sr-side{width:210px;flex:none;background:var(--sr-surface);
  border-right:1px solid var(--sr-border);padding:14px 10px;}
/* uppercase micro-labels — shared type here; per-use spacing on each class */
.sr-nav-label,.sr-col-label,.sr-menu-label,.sr-soon{
  font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--sr-faint);}
.sr-nav-label{padding:0 8px;margin:6px 0 6px;}
.sr-nav-item{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--sr-muted);
  padding:8px 10px;border-radius:8px;margin-bottom:2px;}
.sr-nav-item.is-active{background:var(--sr-accent);color:var(--sr-on-accent);font-weight:600;}
.sr-nav-item.is-disabled{opacity:.45;cursor:default;}
.sr-nav-ic{width:15px;height:15px;border-radius:4px;background:var(--sr-surface-3);flex:none;}
.sr-nav-item.is-active .sr-nav-ic{background:rgba(var(--sr-on-accent-rgb),.35);}
.sr-soon{font-size:9px;letter-spacing:.06em;margin-left:auto;}
.sr-pagelist{margin-top:6px;padding-top:10px;border-top:1px solid var(--sr-border);}
.sr-page{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--sr-muted);
  padding:6px 10px;border-radius:7px;}
.sr-page:hover,.sr-page:focus-visible{background:var(--sr-surface-2);color:var(--sr-text);}
.sr-page.is-active{color:var(--sr-text);background:var(--sr-surface-2);}
.sr-home-dot{color:var(--sr-accent-soft);}
.sr-newpage{display:inline-block;font-size:12px;color:var(--sr-accent-soft);padding:8px 10px;}
.sr-slug{color:var(--sr-muted);font-size:11px;}

/* main */
.sr-main{flex:1;min-width:0;padding:18px 22px;}

/* buttons / chips — one .sr-btn base; every variant is a modifier layered on
   top of it (compose in markup: class="sr-btn sr-btn-primary", etc.) */
.sr-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;
  font-size:12px;padding:6px 12px;border-radius:8px;border:1px solid var(--sr-border);
  background:transparent;color:var(--sr-muted);}
.sr-btn:not(:disabled):hover{color:var(--sr-text);border-color:var(--sr-faint);}
.sr-btn:disabled{opacity:.5;cursor:default;}
/* filled accent — restate color on hover so the base :hover text color can't win */
.sr-btn-primary{border-color:transparent;font-weight:600;color:var(--sr-on-accent);background:var(--sr-accent);}
.sr-btn-primary:not(:disabled):hover{background:var(--sr-accent-hi);border-color:transparent;color:var(--sr-on-accent);}
.sr-btn-primary:disabled{background:var(--sr-accent);}
/* compact icon button */
.sr-btn-icon{padding:3px 8px;border-radius:6px;background:var(--sr-surface-2);}
.sr-btn-danger{color:var(--sr-accent-soft);}
/* large CTA (sign-in) */
.sr-btn-lg{font-size:14px;padding:.6rem 1.3rem;border-radius:9px;}
/* dashed "add" affordance */
.sr-btn-add{border-style:dashed;color:var(--sr-accent-soft);padding:9px 14px;border-radius:9px;}
.sr-btn-add:hover{color:var(--sr-accent);border-color:var(--sr-accent);}
.sr-chip{font-size:10.5px;padding:3px 9px;border-radius:999px;background:var(--sr-surface-2);color:var(--sr-muted);}
.sr-pending{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;
  color:var(--sr-accent-soft);background:var(--sr-surface-2);border:1px solid var(--sr-border);
  padding:5px 11px;border-radius:999px;}
.sr-pending::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--sr-accent);flex:none;}

/* editor */
.sr-edhead{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
.sr-title{font-size:19px;font-weight:700;color:var(--sr-text);}
.sr-cols{display:flex;gap:16px;}
.sr-col{flex:1;min-width:0;}
.sr-col-sections{flex:0 1 240px;min-width:170px;}
/* editor + preview each claim half of the space left after the section list */
.sr-col-preview{flex:1;}
.sr-col-label{margin-bottom:9px;}

/* section list (left aside of the editor) */
.sr-seclist{list-style:none;margin:0;padding:0;}
.sr-secrow{display:flex;align-items:center;gap:7px;background:var(--sr-surface);
  border:1px solid var(--sr-border);border-radius:9px;padding:8px 10px;margin-bottom:7px;}
.sr-secrow.is-active{border-color:var(--sr-accent);box-shadow:0 0 0 2px rgba(var(--sr-accent-rgb),.18);}
.sr-grip{background:none;border:none;padding:0 2px;color:var(--sr-faint);font-size:15px;cursor:grab;line-height:1;}
.sr-grip:hover{color:var(--sr-muted);}
.sr-secrow-label{flex:1;background:transparent;border:none;color:var(--sr-text);font-size:13px;text-align:left;padding:0;}
.sr-secrow-warn{color:var(--sr-accent);}

/* fields */
.sr-field{margin-bottom:11px;}
.sr-flabel{display:block;font-size:11px;color:var(--sr-muted);margin-bottom:4px;}
.sr-input{width:100%;background:var(--sr-surface-2);border:1px solid var(--sr-border);border-radius:7px;
  padding:8px 10px;font-size:12.5px;color:var(--sr-text);}
.sr-input::placeholder{color:var(--sr-faint);}
.sr-input:focus{outline:none;border-color:var(--sr-accent);box-shadow:0 0 0 2px rgba(var(--sr-accent-rgb),.22);}
.sr-error{color:var(--sr-accent-hi);font-size:11px;margin-left:8px;}
.sr-fieldset{border:1px solid var(--sr-border);border-radius:9px;padding:10px 12px;margin-bottom:11px;background:var(--sr-surface);}
.sr-legend{font-size:12px;font-weight:600;color:var(--sr-text);padding:0 6px;}
.sr-arr-item{border-left:2px solid var(--sr-border);padding-left:0.5rem;margin-bottom:0.5rem;}

/* richText */
.sr-toolbar{display:flex;gap:3px;padding:5px 6px;background:var(--sr-surface-2);
  border:1px solid var(--sr-border);border-bottom:none;border-radius:7px 7px 0 0;}
.sr-tb{min-width:22px;height:20px;border-radius:4px;background:var(--sr-surface-3);color:var(--sr-muted);
  font-size:11px;border:none;display:flex;align-items:center;justify-content:center;padding:0 5px;}
.sr-tb:hover{color:var(--sr-text);}
.sr-tb.is-active{background:var(--sr-accent);color:var(--sr-on-accent);}
.sr-rich{background:var(--sr-surface-2);border:1px solid var(--sr-border);border-radius:0 0 7px 7px;
  min-height:70px;padding:8px 10px;color:var(--sr-text);font-size:12.5px;}
.sr-rich:focus-within{border-color:var(--sr-accent);}
.sr-rich .ProseMirror{outline:none;min-height:54px;color:var(--sr-text);}
.sr-rich .ProseMirror p{margin:0 0 8px;}
.sr-rich .ProseMirror> :last-child{margin-bottom:0;}
.sr-rich .ProseMirror h2{font-size:1.2rem;margin:0 0 8px;color:var(--sr-text);}
.sr-rich .ProseMirror ul{margin:0 0 8px;padding-left:1.2rem;}
.sr-rich .ProseMirror a{color:var(--sr-accent-soft);}

/* image */
.sr-imgrow{display:flex;align-items:center;gap:11px;}
.sr-thumb{width:72px;height:50px;border-radius:6px;flex:none;object-fit:cover;
  background:var(--sr-surface-3);border:1px solid var(--sr-border);}
.sr-link{font-size:11px;color:var(--sr-accent-soft);background:none;border:none;padding:0;}

/* media dialog */
.sr-dialog{background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:12px;
  padding:16px;max-width:640px;color:var(--sr-text);}
.sr-dialog-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.sr-media-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px;}
.sr-media-item{position:relative;}
.sr-media-thumb{display:block;width:100%;height:70px;padding:0;overflow:hidden;
  border:1px solid var(--sr-border);border-radius:7px;background:none;cursor:pointer;}
.sr-media-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
.sr-media-del{position:absolute;top:3px;right:3px;font-size:10px;background:rgba(var(--sr-bg-rgb),.8);
  border:1px solid var(--sr-border);border-radius:6px;color:var(--sr-accent-soft);padding:2px 5px;}
.sr-upload{font-size:12px;color:var(--sr-accent-soft);}
.sr-alert{color:var(--sr-accent-hi);font-size:12px;}

/* preview — let the iframed site paint its own background; the surface tone is
   only a brief load placeholder, never an off-white cast over the real page */
.sr-preview{border:1px solid var(--sr-border);border-radius:10px;overflow:hidden;background:var(--sr-surface-2);}
.sr-preview-frame{width:100%;height:520px;border:none;display:block;background:transparent;}

/* sign-in / error cards */
.sr-center{max-width:420px;margin:14vh auto;padding:2rem;text-align:center;
  background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:14px;}
.sr-center.wide{max-width:560px;text-align:left;}
.sr-center h1{color:var(--sr-text);}

/* content width — keep screens off the full-bleed edge, consistently */
.sr-screen{max-width:1160px;}

/* add-section dropdown (button trigger + attached menu panel) */
.sr-menu-wrap{position:relative;display:inline-block;margin-top:4px;}
.sr-menu-trigger{display:inline-block;list-style:none;}
.sr-menu-trigger::-webkit-details-marker{display:none;}
.sr-menu-trigger::marker{content:"";}
.sr-menu{position:absolute;top:calc(100% + 5px);left:0;z-index:20;min-width:190px;
  background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:10px;
  box-shadow:0 12px 30px rgba(0,0,0,.45);padding:5px;}
.sr-menu-label{padding:6px 9px 4px;}
.sr-menu-item{display:block;width:100%;text-align:left;background:none;border:none;
  color:var(--sr-text);font-size:13px;padding:8px 10px;border-radius:7px;}
.sr-menu-item:hover{background:var(--sr-surface-2);}

/* clickable affordances — hover feedback on interactive elements */
.sr-nav-item:not(.is-active):not(.is-disabled):hover{color:var(--sr-text);background:var(--sr-surface-2);}
.sr-newpage:hover,.sr-link:hover,.sr-upload:hover{color:var(--sr-accent);text-decoration:underline;}
.sr-secrow-label:hover{color:var(--sr-accent-soft);}
.sr-media-thumb:hover{border-color:var(--sr-accent);}
.sr-media-del:hover{color:var(--sr-accent-hi);border-color:var(--sr-faint);}

/* keyboard focus — one accent ring for every interactive element (the browser
   default outline is nearly invisible against this dark palette) */
.sr-btn:focus-visible,.sr-tb:focus-visible,.sr-menu-item:focus-visible,
.sr-grip:focus-visible,.sr-link:focus-visible,.sr-newpage:focus-visible,
.sr-upload:focus-visible,.sr-nav-item:focus-visible,.sr-secrow-label:focus-visible,
.sr-media-thumb:focus-visible,.sr-page:focus-visible{
  outline:2px solid var(--sr-accent);outline-offset:2px;}
`;
