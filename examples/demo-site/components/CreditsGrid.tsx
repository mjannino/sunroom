import Image from "next/image";
import type { ImageValue } from "sunroom";
import s from "./CreditsGrid.module.css";

interface Record_ {
  cover?: ImageValue;
  band?: string;
  release?: string;
}

export default function CreditsGrid({
  title,
  records,
}: {
  title?: string;
  records?: Record_[];
}) {
  return (
    <section className={s.section}>
      {title ? <p className="label">{title}</p> : null}
      <ul className={s.grid}>
        {(records ?? []).map((r, i) => (
          <li key={i} className={s.card}>
            {r.cover ? (
              <div className={s.coverFrame}>
                <Image
                  src={r.cover.url}
                  alt={r.cover.alt ?? r.band ?? ""}
                  width={r.cover.width}
                  height={r.cover.height}
                  className={s.cover}
                />
              </div>
            ) : null}
            {r.band ? <p className={s.band}>{r.band}</p> : null}
            {r.release ? <p className={s.release}>{r.release}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
