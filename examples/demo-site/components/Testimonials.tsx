export default function Testimonials({
  title,
  quotes,
}: {
  title?: string;
  quotes?: { quote?: string; author?: string }[];
}) {
  return (
    <section className="testimonials">
      {title ? <h2>{title}</h2> : null}
      <ul>
        {(quotes ?? []).map((q, i) => (
          <li key={i}>
            <blockquote>{q.quote}</blockquote>
            <cite>{q.author}</cite>
          </li>
        ))}
      </ul>
    </section>
  );
}
