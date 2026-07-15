import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import type { SunroomConfig, SunroomInput } from "./core/registry.js";
import { resolveConfig } from "./core/registry.js";
import { Sections } from "./render/sections.js";
import { paramsToSlug, slugToParams } from "./store/paths.js";
import { getStore } from "./store/singleton.js";
import type { Page, PageSummary } from "./store/types.js";

/** Next 15 passes `params` as a Promise. */
interface RouteProps {
  params: Promise<{ slug?: string[] }>;
}

export interface Sunroom {
  config: SunroomConfig;
  Page(props: RouteProps): Promise<ReactElement>;
  generateStaticParams(): Promise<{ slug: string[] }[]>;
  generateMetadata(props: RouteProps): Promise<Metadata>;
  getPages(): Promise<PageSummary[]>;
  getPage(slug: string): Promise<Page | null>;
}

/**
 * Wires a component registry to a content store and returns the exports a Next
 * catch-all route needs.
 *
 * ```tsx
 * // sunroom.config.ts
 * export default createSunroom({ sections: { hero: defineSection({ ... }) } })
 *
 * // app/[[...slug]]/page.tsx
 * import sunroom from '@/sunroom.config'
 * export const generateStaticParams = sunroom.generateStaticParams
 * export const generateMetadata = sunroom.generateMetadata
 * export default sunroom.Page
 * ```
 */
export function createSunroom(input: SunroomInput): Sunroom {
  const config = resolveConfig(input);

  async function generateStaticParams(): Promise<{ slug: string[] }[]> {
    const store = await getStore(config);
    return store.listPages().map((page) => ({ slug: slugToParams(page.slug) }));
  }

  async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
    const { slug } = await params;
    const store = await getStore(config);
    const entry = store.getPage(paramsToSlug(slug));
    if (!entry) return {};

    const { seoDefaults } = store.getSettings();
    return {
      title: entry.page.seo.title ?? entry.page.title,
      description: entry.page.seo.description ?? seoDefaults.description,
    };
  }

  async function Page({ params }: RouteProps): Promise<ReactElement> {
    const { slug } = await params;
    const store = await getStore(config);
    const entry = store.getPage(paramsToSlug(slug));
    if (!entry) notFound();

    return <Sections config={config} sections={entry.page.sections} />;
  }

  async function getPages(): Promise<PageSummary[]> {
    const store = await getStore(config);
    return store.listPages();
  }

  async function getPage(slug: string): Promise<Page | null> {
    const store = await getStore(config);
    return store.getPage(slug)?.page ?? null;
  }

  return {
    config,
    Page,
    generateStaticParams,
    generateMetadata,
    getPages,
    getPage,
  };
}
