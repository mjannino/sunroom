import Image from "next/image";
import type { ImageValue } from "../core/fields.js";

interface CreditsRecord {
  cover?: ImageValue;
  band?: string;
  release?: string;
}

export default function CreditsGrid({
  title,
  records,
}: {
  title?: string;
  records?: CreditsRecord[];
}) {
  return (
    <section className="srs-creditsgrid">
      {title ? <p className="srs-label">{title}</p> : null}
      <ul className="srs-creditsgrid-grid">
        {(records ?? []).map((r, i) => (
          <li key={i} className="srs-creditsgrid-card">
            {r.cover ? (
              <div className="srs-creditsgrid-frame">
                <Image
                  src={r.cover.url}
                  alt={r.cover.alt ?? r.band ?? ""}
                  width={r.cover.width}
                  height={r.cover.height}
                  className="srs-creditsgrid-cover"
                />
              </div>
            ) : null}
            {r.band ? <p className="srs-creditsgrid-band">{r.band}</p> : null}
            {r.release ? (
              <p className="srs-creditsgrid-release">{r.release}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
