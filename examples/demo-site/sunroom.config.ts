import { createSunroom, defineSection, f } from "sunroom";
import Hero from "@/components/Hero";
import CreditsGrid from "@/components/CreditsGrid";
import Embed from "@/components/Embed";
import Discography from "@/components/Discography";
import Carousel from "@/components/Carousel";
import Prose from "@/components/Prose";
import Cta from "@/components/Cta";

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
    creditsGrid: defineSection({
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
    }),
    embed: defineSection({
      label: "Embedded player",
      component: Embed,
      fields: {
        provider: f.select({
          label: "Provider",
          options: [
            { value: "spotify", label: "Spotify" },
            { value: "youtube", label: "YouTube" },
            { value: "soundcloud", label: "SoundCloud" },
          ],
        }),
        url: f.link({ label: "Share URL" }),
        title: f.text({ label: "Title" }),
      },
    }),
    discography: defineSection({
      label: "Discography list",
      component: Discography,
      fields: {
        title: f.text({ label: "Section title" }),
        entries: f.array(
          f.object({
            label: f.text({ label: "Label" }),
            url: f.link({ label: "Link (optional)" }),
          }),
          { label: "Entries" },
        ),
      },
    }),
    carousel: defineSection({
      label: "Carousel",
      component: Carousel,
      fields: {
        title: f.text({ label: "Section title" }),
        items: f.array(
          f.object({
            image: f.image({ label: "Image" }),
            name: f.text({ label: "Name" }),
            note: f.text({ label: "Note" }),
          }),
          { label: "Items" },
        ),
      },
    }),
    prose: defineSection({
      label: "Prose",
      component: Prose,
      fields: {
        kicker: f.text({ label: "Kicker" }),
        body: f.richText({ label: "Body" }),
        sidebar: f.object(
          {
            contactBlurb: f.textarea({ label: "Contact blurb" }),
            ctaLabel: f.text({ label: "CTA label" }),
            bookingHeading: f.text({ label: "Booking heading" }),
            bookingBody: f.richText({ label: "Booking body" }),
          },
          { label: "Sidebar" },
        ),
      },
    }),
    cta: defineSection({
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
        href: f.link({ label: "Link (if action = link)" }),
      },
    }),
  },
});
