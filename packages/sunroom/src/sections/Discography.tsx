interface DiscographyEntry {
  label?: string;
  url?: string;
}

export default function Discography({
  title,
  entries,
}: {
  title?: string;
  entries?: DiscographyEntry[];
}) {
  return (
    <section className="srs-discography">
      {title ? <p className="srs-label">{title}</p> : null}
      <ul className="srs-discography-list">
        {(entries ?? [])
          .filter((e) => e.label)
          .map((e, i) => (
            <li key={i} className="srs-discography-item">
              {e.url ? (
                <a
                  href={e.url}
                  className="srs-discography-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
