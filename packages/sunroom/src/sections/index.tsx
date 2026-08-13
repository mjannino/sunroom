import { defineSection } from "../core/registry.js";
import { f } from "../core/fields.js";
import Gallery from "./Gallery.js";

export { Gallery };
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
