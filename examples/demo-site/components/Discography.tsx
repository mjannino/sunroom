import s from "./Discography.module.css";

interface Entry {
  label?: string;
  url?: string;
}

export default function Discography({
  title,
  entries,
}: {
  title?: string;
  entries?: Entry[];
}) {
  return (
    <section className={s.section}>
      {title ? <p className="label">{title}</p> : null}
      <ul className={s.list}>
        {(entries ?? [])
          .filter((e) => e.label)
          .map((e, i) => (
            <li key={i} className={s.item}>
              {e.url ? (
                <a href={e.url} className={s.link} target="_blank" rel="noopener noreferrer">
                  {e.label}
                </a>
              ) : (
                <span>{e.label}</span>
              )}
            </li>
          ))}
      </ul>
    </section>
  );
}
