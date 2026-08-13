import { defineSection } from "../core/registry.js";
import { f } from "../core/fields.js";
import Gallery from "./Gallery.js";
import Hero from "./Hero.js";
import Cta from "./Cta.js";

export { Gallery };
export { Hero };
export { Cta };
export { SectionsProvider, useSections } from "./provider.js";

export const gallerySection = defineSection({
  label: "Gallery",
  component: Gallery,
  fields: {
    title: f.text({ label: "Section title" }),
    images: f.array(f.image({ label: "Image" }), {
      label: "Images",
      itemLabel: "Image",
    }),
  },
});

export const heroSection = defineSection({
  label: "Hero",
  component: Hero,
  fields: {
    image: f.image({ label: "Image", required: true }),
    text: f.text({ label: "Text" }),
    placement: f.select({
      label: "Text placement",
      options: [
        { value: "overlay", label: "Overlay on image" },
        { value: "above", label: "Above image" },
      ],
    }),
  },
});

export const ctaSection = defineSection({
  label: "Call to action",
  component: Cta,
  fields: {
    label: f.text({ label: "Label" }),
    action: f.select({
      label: "Action",
      options: [
        { value: "contact", label: "Open contact form" },
        { value: "link", label: "Go to link" },
      ],
    }),
    href: f.link({
      label: "Link",
      showWhen: { field: "action", equals: "link" },
    }),
  },
});
