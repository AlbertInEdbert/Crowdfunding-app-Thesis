"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Field = "title" | "description";

type ClaimFieldProps = {
  title: string;
  description: string;
  onChange: (field: Field, value: string) => void;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  className?: string;
};

const bare =
  "rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent";

export default function HighlightField({
  title,
  description,
  onChange,
  titlePlaceholder = "Highlight title",
  descriptionPlaceholder = "Describe the highlight",
  className,
}: ClaimFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [description]);

  return (
    <div
      className={cn(
        "flex-1 rounded-md border border-input bg-background px-3 py-2",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
        className
      )}
    >
      <Input
        type="text"
        value={title}
        onChange={(e) => onChange("title", e.target.value)}
        placeholder={titlePlaceholder}
        className={cn(bare, "h-auto text-sm font-medium text-foreground")}
      />
      <Textarea
        ref={textareaRef}
        rows={1}
        value={description}
        onChange={(e) => onChange("description", e.target.value)}
        placeholder={descriptionPlaceholder}
        onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            }
        }}
        className={cn(
          bare,
          "mt-1 min-h-10 resize-none text-sm leading-relaxed text-muted-foreground"
        )}
      />
    </div>
  );
}