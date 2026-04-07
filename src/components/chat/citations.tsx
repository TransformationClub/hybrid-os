"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface CitationSource {
  title: string;
  path: string;
  type: string;
  snippet?: string;
}

interface CitationsProps {
  sources: CitationSource[];
}

export function Citations({ sources }: CitationsProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!sources.length) return null;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => {
          setExpanded(!expanded);
          if (expanded) setActiveIndex(null);
        }}
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <BookOpen className="size-3" />
        <span>
          {sources.length} {sources.length === 1 ? "source" : "sources"}
        </span>
        {expanded ? (
          <ChevronDown className="size-2.5" />
        ) : (
          <ChevronRight className="size-2.5" />
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 flex flex-col gap-1">
          {/* Citation badges row */}
          <div className="flex flex-wrap gap-1">
            {sources.map((source, i) => (
              <Badge
                key={i}
                variant={activeIndex === i ? "default" : "outline"}
                className="cursor-pointer text-[10px] h-4 px-1.5 font-mono"
                onClick={() =>
                  setActiveIndex(activeIndex === i ? null : i)
                }
              >
                [{i + 1}]
              </Badge>
            ))}
          </div>

          {/* Expanded source detail */}
          {activeIndex !== null && sources[activeIndex] && (
            <div className="rounded-md border border-border bg-muted/50 px-2.5 py-2 text-[11px] space-y-0.5">
              <p className="font-medium text-foreground leading-tight">
                {sources[activeIndex].title}
              </p>
              <p className="text-muted-foreground font-mono text-[10px] truncate">
                {sources[activeIndex].path}
              </p>
              {sources[activeIndex].snippet && (
                <p className="text-muted-foreground leading-relaxed mt-1">
                  {sources[activeIndex].snippet}
                </p>
              )}
              <Badge
                variant="secondary"
                className="text-[9px] h-3.5 px-1 mt-0.5"
              >
                {sources[activeIndex].type}
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
