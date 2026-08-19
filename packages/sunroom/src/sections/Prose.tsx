import { ContactButton } from "sunroom/sections/client";

interface ProseSidebar {
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
  sidebar?: ProseSidebar;
}) {
  const hasSidebar =
    !!sidebar &&
    !!(
      sidebar.contactBlurb ||
      sidebar.ctaLabel ||
      sidebar.bookingHeading ||
      sidebar.bookingBody
    );

  return (
    <section className={`srs-prose${hasSidebar ? " srs-prose-rail" : ""}`}>
      <div className="srs-prose-main">
        {kicker ? <p className="srs-label">{kicker}</p> : null}
        {body ? (
          <div
            className="srs-prose-body"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : null}
      </div>
      {hasSidebar ? (
        <aside className="srs-prose-rail-aside">
          {sidebar!.contactBlurb ? (
            <p className="srs-prose-blurb">{sidebar!.contactBlurb}</p>
          ) : null}
          {sidebar!.ctaLabel ? (
            <ContactButton label={sidebar!.ctaLabel} />
          ) : null}
          {sidebar!.bookingHeading ? (
            <p className="srs-label">{sidebar!.bookingHeading}</p>
          ) : null}
          {sidebar!.bookingBody ? (
            <div
              className="srs-prose-booking"
              dangerouslySetInnerHTML={{ __html: sidebar!.bookingBody }}
            />
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}
