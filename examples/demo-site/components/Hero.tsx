import Image from "next/image";
import type { ImageValue } from "sunroom";
import s from "./Hero.module.css";

export default function Hero({
  image,
  text,
  placement = "overlay",
}: {
  image: ImageValue;
  text?: string;
  placement?: string;
}) {
  const frame = image ? (
    <div className={s.frame}>
      <Image
        src={image.url}
        alt={image.alt ?? ""}
        width={image.width}
        height={image.height}
        className={s.img}
        priority
      />
      {placement === "overlay" && text ? (
        <p className={`label ${s.overlay}`}>{text}</p>
      ) : null}
    </div>
  ) : null;

  return (
    <section className={s.hero}>
      {placement === "above" && text ? <p className="label">{text}</p> : null}
      {frame}
    </section>
  );
}
