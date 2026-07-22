import { createSunroom, defineSection, f } from "sunroom";
import Hero from "@/components/Hero";
import Testimonials from "@/components/Testimonials";

export default createSunroom({
  sections: {
    hero: defineSection({
      label: "Hero",
      component: Hero,
      fields: {
        kicker: f.text({ label: "Kicker" }),
        image: f.image({ label: "Image", required: true }),
        heading: f.text({ label: "Heading" }),
      },
    }),
    testimonials: defineSection({
      label: "Testimonials",
      component: Testimonials,
      fields: {
        title: f.text({ label: "Section title" }),
        quotes: f.array(
          f.object({
            quote: f.textarea({ label: "Quote" }),
            author: f.text({ label: "Author" }),
          }),
          { label: "Quotes" },
        ),
      },
    }),
  },
});
