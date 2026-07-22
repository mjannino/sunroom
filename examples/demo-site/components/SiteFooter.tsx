import s from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={s.footer}>
      <span className={s.copy}>© MARA VOSS RECORDING — THE LONGSHOT ROOM, PHILADELPHIA</span>
      <span className={s.social}>
        <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
        <span aria-hidden="true">·</span>
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
      </span>
    </footer>
  );
}
