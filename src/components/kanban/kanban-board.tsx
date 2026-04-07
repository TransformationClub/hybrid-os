"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KanbanColumnConfig<T> {
  key: string;
  label: string;
  items: T[];
}

export interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumnConfig<T>[];
  onItemMove?: (
    itemId: string,
    fromColumn: string,
    toColumn: string,
    newIndex: number
  ) => void;
  onColumnsChange?: (columns: KanbanColumnConfig<T>[]) => void;
  renderCard: (item: T, isDragging: boolean) => React.ReactNode;
  renderOverlay?: (item: T) => React.ReactNode;
  renderColumnHeader?: (
    column: KanbanColumnConfig<T>,
    itemCount: number
  ) => React.ReactNode;
  columnClassName?: string;
  boardClassName?: string;
}

// ---------------------------------------------------------------------------
// KanbanCard (sortable wrapper)
// ---------------------------------------------------------------------------

export function KanbanCard<T extends { id: string }>({
  item,
  renderCard,
}: {
  item: T;
  renderCard: (item: T, isDragging: boolean) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {renderCard(item, isDragging)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KanbanColumn (droppable container with sortable context)
// ---------------------------------------------------------------------------

export function KanbanColumn<T extends { id: string }>({
  column,
  renderCard,
  renderColumnHeader,
  className,
}: {
  column: KanbanColumnConfig<T>;
  renderCard: (item: T, isDragging: boolean) => React.ReactNode;
  renderColumnHeader?: (
    column: KanbanColumnConfig<T>,
    itemCount: number
  ) => React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  const itemIds = useMemo(
    () => column.items.map((item) => item.id),
    [column.items]
  );

  return (
    <div className={cn("flex w-72 shrink-0 flex-col gap-3", className)}>
      {renderColumnHeader?.(column, column.items.length)}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-[60px] flex-col gap-2 rounded-lg p-1 transition-colors",
            isOver && "bg-primary/5 ring-1 ring-primary/20"
          )}
        >
          {column.items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              renderCard={renderCard}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KanbanBoard (DnD context + column layout)
// ---------------------------------------------------------------------------

export function KanbanBoard<T extends { id: string }>({
  columns,
  onItemMove,
  onColumnsChange,
  renderCard,
  renderOverlay,
  renderColumnHeader,
  columnClassName,
  boardClassName,
}: KanbanBoardProps<T>) {
  const [activeItem, setActiveItem] = useState<T | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Build a lookup: itemId -> columnKey
  const itemColumnMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of columns) {
      for (const item of col.items) {
        map.set(item.id, col.key);
      }
    }
    return map;
  }, [columns]);

  // Find the column key for a given id (could be an item or column)
  const findColumnKey = useCallback(
    (id: string): string | undefined => {
      // Check if it is a column key
      if (columns.some((c) => c.key === id)) return id;
      // Otherwise look up the item
      return itemColumnMap.get(id);
    },
    [columns, itemColumnMap]
  );

  // Find an item by id across all columns
  const findItem = useCallback(
    (id: string): T | undefined => {
      for (const col of columns) {
        const found = col.items.find((item) => item.id === id);
        if (found) return found;
      }
      return undefined;
    },
    [columns]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const item = findItem(String(event.active.id));
      setActiveItem(item ?? null);
    },
    [findItem]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const activeCol = findColumnKey(activeId);
      const overCol = findColumnKey(overId);

      if (!activeCol || !overCol || activeCol === overCol) return;

      // Move item between columns during drag-over for visual feedback
      const newColumns = columns.map((col) => ({
        ...col,
        items: [...col.items],
      }));

      const fromCol = newColumns.find((c) => c.key === activeCol);
      const toCol = newColumns.find((c) => c.key === overCol);
      if (!fromCol || !toCol) return;

      const activeIndex = fromCol.items.findIndex((i) => i.id === activeId);
      if (activeIndex === -1) return;

      const [movedItem] = fromCol.items.splice(activeIndex, 1);

      // If dropping over an item in the target column, insert at that index
      const overIndex = toCol.items.findIndex((i) => i.id === overId);
      if (overIndex >= 0) {
        toCol.items.splice(overIndex, 0, movedItem);
      } else {
        // Dropping on the column itself: append
        toCol.items.push(movedItem);
      }

      onColumnsChange?.(newColumns);
    },
    [columns, findColumnKey, onColumnsChange]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveItem(null);

      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const activeCol = findColumnKey(activeId);
      const overCol = findColumnKey(overId);

      if (!activeCol || !overCol) return;

      // Same column reorder
      if (activeCol === overCol) {
        const col = columns.find((c) => c.key === activeCol);
        if (!col) return;

        const oldIndex = col.items.findIndex((i) => i.id === activeId);
        const newIndex = col.items.findIndex((i) => i.id === overId);

        if (oldIndex !== newIndex && oldIndex >= 0 && newIndex >= 0) {
          const newColumns = columns.map((c) => {
            if (c.key !== activeCol) return c;
            return { ...c, items: arrayMove(c.items, oldIndex, newIndex) };
          });
          onColumnsChange?.(newColumns);
          onItemMove?.(activeId, activeCol, activeCol, newIndex);
        }
        return;
      }

      // Cross-column move already happened in dragOver.
      // Just fire the callback with final position.
      const toCol = columns.find((c) => c.key === overCol);
      const newIndex = toCol
        ? toCol.items.findIndex((i) => i.id === activeId)
        : 0;
      onItemMove?.(activeId, activeCol, overCol, Math.max(newIndex, 0));
    },
    [columns, findColumnKey, onColumnsChange, onItemMove]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn("flex min-w-max gap-4", boardClassName)}>
        {columns.map((col) => (
          <KanbanColumn
            key={col.key}
            column={col}
            renderCard={renderCard}
            renderColumnHeader={renderColumnHeader}
            className={columnClassName}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem
          ? (renderOverlay ?? renderCard)(activeItem, true)
          : null}
      </DragOverlay>
    </DndContext>
  );
}
