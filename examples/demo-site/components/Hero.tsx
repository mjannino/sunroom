import Image from "next/image";
import type { ImageValue } from "sunroom";

export default function Hero({
  heading,
  body,
  image,
}: {
  heading: string;
  body?: string;
  image?: ImageValue;
}) {
  return (
    <section className="hero">
      {image ? (
        <Image
          src={image.url}
          alt={image.alt ?? ""}
          width={image.width}
          height={image.height}
        />
      ) : null}
      <h1>{heading}</h1>
      {body ? (
        <div className="hero-body" dangerouslySetInnerHTML={{ __html: body }} />
      ) : null}
    </section>
  );
}
