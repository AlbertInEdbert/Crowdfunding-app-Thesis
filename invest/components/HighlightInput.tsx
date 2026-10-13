"use client";

import { useId } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import HighlightField from "@/components/ui/highlight-field";
import { cn } from "@/lib/utils";
import { Highlight } from "@/lib/campaign";

type Field = "title" | "description";

let uidCounter = 0;
const newUid = () => `highlight-${Date.now().toString(36)}-${uidCounter++}`;

export const createHighlight = (): Highlight => ({
  uid: newUid(),
  seqNo: 1,
  title: "",
  description: "",
});

const renumber = (list: Highlight[]): Highlight[] =>
  list.map((h, i) => ({ ...h, seqNo: i + 1 }));

export const toHighlights = (
  rows: { seqNo: number; title: string; description: string }[]
): Highlight[] =>
  renumber(
    [...rows]
      .sort((a, b) => a.seqNo - b.seqNo)
      .map((r) => ({ ...r, uid: newUid() }))
  );

export const toPayload = (list: Highlight[]) =>
  list
    .filter((h) => h.title.trim() || h.description.trim())
    .map((h, i) => ({
      seqNo: i + 1,
      title: h.title,
      description: h.description,
    }));

function SortableRow({
  item,
  position,
  onChange,
  onRemove,
}: {
  item: Highlight;
  position: number;
  onChange: (field: Field, value: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.uid });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-1.5 rounded-lg bg-card transition-shadow",
        isDragging && "shadow-md ring-1 ring-ring/20"
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="mt-1.5 cursor-grab touch-none rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag to reorder highlight ${position}`}
      >
        <GripVertical className="size-4" />
      </button>

      <span className="mt-3 w-6 text-center text-sm font-medium text-muted-foreground">
        {position}
      </span>

      <HighlightField
        title={item.title}
        description={item.description}
        onChange={onChange}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`Remove highlight ${position}`}
        className="mt-1.5 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

type HighlightsInputProps = {
  value: Highlight[];
  onChange: (value: Highlight[]) => void;
  max?: number;
  name?: string;
  className?: string;
};

export default function HighlightsInput({
  value,
  onChange,
  max = 10,
  name,
  className,
}: HighlightsInputProps) {

  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const emit = (next: Highlight[]) => onChange(renumber(next));
 
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
 
    const from = value.findIndex((i) => i.uid === active.id);
    const to = value.findIndex((i) => i.uid === over.id);
    emit(arrayMove(value, from, to));
  };
  const add = () => {
    if (value.length < max) emit([...value, createHighlight()]);
  };
 
  const remove = (uid: string) => emit(value.filter((i) => i.uid !== uid));
 
  const update = (uid: string, field: Field, text: string) =>
    emit(value.map((i) => (i.uid === uid ? { ...i, [field]: text } : i)));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {name && (
        <input type="hidden" name={name} value={JSON.stringify(toPayload(value))} />
      )}

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={value.map((i) => i.uid)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {value.map((item, index) => (
              <SortableRow
                key={item.uid}
                item={item}
                position={index + 1}
                onChange={(field, text) => update(item.uid, field, text)}
                onRemove={() => remove(item.uid)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        onClick={add}
        disabled={value.length >= max}
        className="self-start"
      >
        <Plus className="size-4" />
        Add highlight ({value.length}/{max})
      </Button>
    </div>
  );
}