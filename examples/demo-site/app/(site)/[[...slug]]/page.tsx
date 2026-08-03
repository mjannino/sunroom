import sunroom from "@/sunroom.config";

// Rendered per request; deliberately NOT prerendered at build time.
//
// This site's content is a RUNTIME artifact: on staging it lives on a Fly volume
// at /data/.sunroom-content, which the Docker image intentionally does not carry.
// At build time there is therefore no real content, and `generateStaticParams`
// (which lists pages from the store) sees only the empty placeholder home page
// that GitStore.init() creates. Exporting it froze that empty render into the
// image, so `/` served a blank page forever while /credits, /gear and /about —
// never prerendered, so rendered on demand — showed the seeded content fine.
//
// Static/ISR is recoverable in principle: the admin calls revalidatePath() on
// every save (see packages/sunroom/src/admin/actions.ts), which regenerates a
// single page in place with no rebuild. But that only stays correct while EVERY
// content change goes through the admin — any out-of-band write (the seed
// script, a migration, a manual fix) silently leaves stale HTML behind.
//
// For this site the trade is clearly worth it: low traffic, one machine, no CDN
// in front, and a render that is a small local JSON read plus some RSC. Static
// buys a few milliseconds that nobody can perceive while costing a whole class
// of staleness bugs. Revisit if a site gets real traffic or a CDN front-door —
// or for a site whose content is committed to the repo, where prerendering is
// correct and free because the build can actually see the content.
export const dynamic = "force-dynamic";

export const generateMetadata = sunroom.generateMetadata;
export default sunroom.Page;
