import { defineSection } from "../core/registry.js";
import { f } from "../core/fields.js";
import { Gallery, Hero, Cta } from "sunroom/sections/client";
import CreditsGrid from "./CreditsGrid.js";
import Discography from "./Discography.js";

export {
  Gallery,
  Hero,
  Cta,
  SectionsProvider,
  useSections,
} from "sunroom/sections/client";

export { default as CreditsGrid } from "./CreditsGrid.js";
export { default as Discography } from "./Discography.js";

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

export const creditsGridSection = defineSection({
  label: "Credits grid",
  component: CreditsGrid,
  fields: {
    title: f.text({ label: "Section title" }),
    records: f.array(
      f.object({
        cover: f.image({ label: "Cover" }),
        band: f.text({ label: "Band" }),
        release: f.text({ label: "Release" }),
      }),
      { label: "Records" },
    ),
  },
});

export const discographySection = defineSection({
  label: "Discography list",
  component: Discography,
  fields: {
    title: f.text({ label: "Section title" }),
    entries: f.array(
      f.object({
        label: f.text({ label: "Label" }),
        url: f.link({ label: "Link (optional)" }),
      }),
      { label: "Entries", itemLabel: "Entry" },
    ),
  },
});
