import { createSunroom } from "sunroom";
import {
  heroSection,
  gallerySection,
  ctaSection,
  creditsGridSection,
  discographySection,
  carouselSection,
  embedSection,
  proseSection,
  proseWithSidebarSection,
} from "sunroom/sections";

export default createSunroom({
  sections: {
    hero: heroSection,
    creditsGrid: creditsGridSection,
    embed: embedSection,
    discography: discographySection,
    carousel: carouselSection,
    gallery: gallerySection,
    prose: proseSection,
    proseWithSidebar: proseWithSidebarSection,
    cta: ctaSection,
  },
});
