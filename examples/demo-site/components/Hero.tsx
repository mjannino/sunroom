import Image from "next/image";
import type { ImageValue } from "sunroom";
import s from "./Hero.module.css";

export default function Hero({
  kicker,
  image,
  heading,
}: {
  kicker?: string;
  image: ImageValue;
  heading?: string;
}) {
  return (
    <section className={s.hero}>
      {kicker ? <p className="label">{kicker}</p> : null}
      {image ? (
        <div className={s.frame}>
          <Image
            src={image.url}
            alt={image.alt ?? ""}
            width={image.width}
            height={image.height}
            className={s.img}
            priority
          />
        </div>
      ) : null}
      {heading ? <h1 className={s.heading}>{heading}</h1> : null}
    </section>
  );
}
