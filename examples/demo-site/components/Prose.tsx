import s from "./Prose.module.css";
import ContactLink from "./ContactLink";

interface Sidebar {
  contactBlurb?: string;
  ctaLabel?: string;
  bookingHeading?: string;
  bookingBody?: string;
}

export default function Prose({
  kicker,
  body,
  sidebar,
}: {
  kicker?: string;
  body?: string;
  sidebar?: Sidebar;
}) {
  const hasSidebar =
    !!sidebar &&
    (sidebar.contactBlurb ||
      sidebar.ctaLabel ||
      sidebar.bookingHeading ||
      sidebar.bookingBody);

  return (
    <section className={`${s.section} ${hasSidebar ? s.withRail : ""}`}>
      <div className={s.main}>
        {kicker ? <p className="label">{kicker}</p> : null}
        {body ? (
          <div className={s.body} dangerouslySetInnerHTML={{ __html: body }} />
        ) : null}
      </div>
      {hasSidebar ? (
        <aside className={s.rail}>
          {sidebar!.contactBlurb ? (
            <p className={s.blurb}>{sidebar!.contactBlurb}</p>
          ) : null}
          {sidebar!.ctaLabel ? (
            <ContactLink className={s.railCta} label={sidebar!.ctaLabel} />
          ) : null}
          {sidebar!.bookingHeading ? (
            <p className="label">{sidebar!.bookingHeading}</p>
          ) : null}
          {sidebar!.bookingBody ? (
            <div
              className={s.bookingBody}
              dangerouslySetInnerHTML={{ __html: sidebar!.bookingBody }}
            />
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}
