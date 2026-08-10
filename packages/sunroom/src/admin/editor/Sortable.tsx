"use client";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

// Exported so the predicate is unit-testable.
export function startsFromInteractiveTarget(
  target: EventTarget | null,
): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest?.(
    'input, textarea, select, button, a, [contenteditable="true"], .ProseMirror, [role="textbox"]',
  );
}

// A drag may start only from a primary left-button press on non-interactive
// row space — mirrors dnd-kit's stock PointerSensor guard plus our own
// interactive-target exclusion.
export function shouldStartRowDrag(event: PointerEvent): boolean {
  return (
    event.isPrimary === true &&
    event.button === 0 &&
    !startsFromInteractiveTarget(event.target)
  );
}

class RowPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent }: { nativeEvent: PointerEvent }) =>
        shouldStartRowDrag(nativeEvent),
    },
  ];
}

export function SortableList({
  ids,
  onReorder,
  children,
}: {
  ids: string[];
  onReorder: (orderedIds: string[]) => void;
  children: ReactNode;
}): React.ReactElement {
  const sensors = useSensors(
    useSensor(RowPointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div data-sortable-list>{children}</div>
      </SortableContext>
    </DndContext>
  );
}

export function SortableRow({
  id,
  label,
  className,
  onActivate,
  children,
}: {
  id: string;
  label?: string;
  className?: string;
  onActivate?: () => void;
  children: ReactNode;
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };
  // dnd-kit's KeyboardSensor claims Space/Enter as drag-activation keys and
  // preventDefaults them. Spread on the whole row, that eats spaces typed into
  // nested inputs. Only let a keydown start a drag when it did NOT originate in
  // an interactive control (mirrors the RowPointerSensor pointer guard).
  const { onKeyDown: dragKeyDown, ...dragListeners } = listeners ?? {};
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={className}
      aria-label={`drag ${label ?? id}`}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (startsFromInteractiveTarget(e.target)) return;
        dragKeyDown?.(e);
      }}
      {...attributes}
      {...dragListeners}
    >
      <span className="sr-grip" aria-hidden="true">
        ⠿
      </span>
      {children}
    </div>
  );
}
