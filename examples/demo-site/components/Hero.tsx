export default function Hero({
  heading,
  body,
}: {
  heading: string;
  body?: string;
}) {
  return (
    <section className="hero">
      <h1>{heading}</h1>
      {body ? (
        <div className="hero-body" dangerouslySetInnerHTML={{ __html: body }} />
      ) : null}
    </section>
  );
}
