import { createSunroom, defineSection, f } from "sunroom";
import Hero from "@/components/Hero";
import Testimonials from "@/components/Testimonials";

export default createSunroom({
  sections: {
    hero: defineSection({
      label: "Hero",
      component: Hero,
      fields: {
        heading: f.text({ label: "Heading", required: true }),
        body: f.richText({ label: "Body" }),
        image: f.image({ label: "Image" }),
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
