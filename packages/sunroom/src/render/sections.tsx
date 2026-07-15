import type { ReactElement } from "react";
import type { SunroomConfig } from "../core/registry.js";
import type { SectionInstance } from "../store/types.js";

export interface SectionsProps {
  config: SunroomConfig;
  sections: SectionInstance[];
}

/**
 * Renders a page's ordered section list against the registry.
 *
 * A section whose component no longer exists in code renders nothing rather
 * than crashing the client's live page. The same condition is a hard failure
 * in `sunroom check` (Phase 7), so it cannot reach production unnoticed —
 * this path exists for the moments in between.
 */
export function Sections({ config, sections }: SectionsProps): ReactElement {
  return (
    <>
      {sections.map((section) => {
        const definition = config.sections[section.type];

        if (!definition) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[sunroom] No section is registered for type "${section.type}" ` +
                `(id ${section.id}). Skipping it. Run \`sunroom check\` to catch this in CI.`,
            );
          }
          return null;
        }

        const Component = definition.component;
        return <Component key={section.id} {...section.props} />;
      })}
    </>
  );
}
