"use client";

import { useMemo, useCallback } from "react";
import type { Claim } from "@/types";

interface HighlightedTextProps {
  text: string;
  claims: Claim[];
  onClaimClick?: (claimId: string) => void;
  activeClaim?: string | null;
}

interface TextSegment {
  text: string;
  claimId: string | null;
  verdict: string | null;
  index: number;
}

/**
 * Renders original text with inline color-coded highlights for each verified claim.
 * Click a highlight to scroll to the corresponding claim card.
 */
export function HighlightedText({ text, claims, onClaimClick, activeClaim }: HighlightedTextProps) {
  const segments = useMemo(() => {
    if (!claims.length || !text) return [{ text, claimId: null, verdict: null, index: 0 }];

    // Sort claims by position_start
    const sorted = [...claims]
      .filter((c) => c.position_start >= 0 && c.position_end > c.position_start)
      .sort((a, b) => a.position_start - b.position_start);

    if (sorted.length === 0) return [{ text, claimId: null, verdict: null, index: 0 }];

    const result: TextSegment[] = [];
    let lastEnd = 0;
    let segIndex = 0;

    for (const claim of sorted) {
      const start = Math.max(claim.position_start, lastEnd);
      const end = Math.min(claim.position_end, text.length);

      if (start > end) continue;

      // Text before this claim
      if (start > lastEnd) {
        result.push({
          text: text.slice(lastEnd, start),
          claimId: null,
          verdict: null,
          index: segIndex++,
        });
      }

      // The claim itself
      result.push({
        text: text.slice(start, end),
        claimId: claim.id,
        verdict: claim.verdict,
        index: segIndex++,
      });

      lastEnd = end;
    }

    // Remaining text after last claim
    if (lastEnd < text.length) {
      result.push({
        text: text.slice(lastEnd),
        claimId: null,
        verdict: null,
        index: segIndex,
      });
    }

    return result;
  }, [text, claims]);

  const getHighlightClasses = useCallback(
    (verdict: string | null, claimId: string | null) => {
      if (!verdict || !claimId) return "";

      const isActive = activeClaim === claimId;
      const base = "cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-all duration-200 border-b-2";

      switch (verdict) {
        case "supported":
          return `${base} bg-emerald-100/60 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-600 hover:bg-emerald-200/80 dark:hover:bg-emerald-800/40 ${
            isActive ? "ring-2 ring-emerald-400/50 bg-emerald-200/80 dark:bg-emerald-800/50" : ""
          }`;
        case "contradicted":
          return `${base} bg-red-100/60 dark:bg-red-900/30 border-red-400 dark:border-red-600 hover:bg-red-200/80 dark:hover:bg-red-800/40 ${
            isActive ? "ring-2 ring-red-400/50 bg-red-200/80 dark:bg-red-800/50" : ""
          }`;
        case "unverifiable":
          return `${base} bg-amber-100/60 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 hover:bg-amber-200/80 dark:hover:bg-amber-800/40 ${
            isActive ? "ring-2 ring-amber-400/50 bg-amber-200/80 dark:bg-amber-800/50" : ""
          }`;
        default:
          return "";
      }
    },
    [activeClaim]
  );

  return (
    <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
      {segments.map((seg) =>
        seg.claimId ? (
          <span
            key={seg.index}
            className={getHighlightClasses(seg.verdict, seg.claimId)}
            onClick={() => onClaimClick?.(seg.claimId!)}
            title={
              seg.verdict === "supported"
                ? "✓ Supported by evidence"
                : seg.verdict === "contradicted"
                ? "✗ Contradicted by evidence"
                : "? Could not verify"
            }
          >
            {seg.text}
          </span>
        ) : (
          <span key={seg.index}>{seg.text}</span>
        )
      )}
    </div>
  );
}

/**
 * Compact legend for the highlighted text
 */
export function HighlightLegend({ locale }: { locale: string }) {
  const items = [
    { color: "bg-emerald-400", label: locale === "de" ? "Bestätigt" : "Supported" },
    { color: "bg-red-400", label: locale === "de" ? "Widerlegt" : "Contradicted" },
    { color: "bg-amber-400", label: locale === "de" ? "Nicht prüfbar" : "Unverifiable" },
  ];

  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
