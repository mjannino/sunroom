import { defineSection } from "../core/registry.js";
import { f } from "../core/fields.js";
import Gallery from "./Gallery.js";
import Hero from "./Hero.js";

export { Gallery };
export { Hero };
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
