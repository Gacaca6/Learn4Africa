"use client";

/**
 * Learn4Africa — Mermaid diagram view.
 *
 * Lazy-loads mermaid only when the student clicks "Show visual" so the
 * ~500KB library doesn't bloat the initial bundle. Renders the SVG into
 * a ref-bound container via dangerouslySetInnerHTML, then makes it
 * responsive.
 *
 * Fails gracefully: if the AI returns invalid Mermaid syntax, we show
 * a friendly fallback rather than a white screen.
 */

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Lightbulb, Network } from "@/lib/icons";

interface DiagramViewProps {
  concept: string;
  moduleTitle: string;
}

type Status = "idle" | "loading" | "ready" | "error";

export function DiagramView({ concept, moduleTitle }: DiagramViewProps) {
  const generateDiagram = useAction(api.ai.visualise.generateDiagram);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);

  async function loadDiagram() {
    setStatus("loading");
    setDiagramSvg(null);
    try {
      const result = await generateDiagram({
        concept,
        diagramType: "flowchart",
        africanContext: true,
      });

      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          primaryColor: "#fef3c7",
          primaryTextColor: "#1f2937",
          primaryBorderColor: "#f59e0b",
          lineColor: "#6b7280",
          background: "#ffffff",
          fontSize: "14px",
        },
        flowchart: { htmlLabels: true, curve: "basis" },
      });

      const id = `mermaid-${Date.now()}`;
      const diagramSource =
        (result as any).diagram ?? (result as any).mermaidCode ?? "";
      if (!diagramSource) {
        setStatus("error");
        return;
      }

      try {
        const { svg } = await mermaid.render(id, diagramSource);
        setDiagramSvg(svg);
        setStatus("ready");
      } catch (renderErr) {
        console.error("Mermaid render error:", renderErr);
        setStatus("error");
      }
    } catch (err) {
      console.error("Diagram action failed:", err);
      setStatus("error");
    }
  }

  useEffect(() => {
    if (diagramSvg && containerRef.current) {
      containerRef.current.innerHTML = diagramSvg;
      const svg = containerRef.current.querySelector("svg");
      if (svg) {
        svg.style.width = "100%";
        svg.style.height = "auto";
        svg.style.maxWidth = "100%";
      }
    }
  }, [diagramSvg]);

  if (status === "idle") {
    return (
      <button
        onClick={loadDiagram}
        className="tap-target w-full p-4 bg-zigama-50 border border-dashed border-zigama-400 rounded-xl text-sm font-semibold text-zigama-800 hover:bg-zigama-100 transition-colors flex items-center justify-center gap-2"
      >
        <Network className="w-4 h-4" />
        Show visual diagram for this concept
      </button>
    );
  }

  if (status === "loading") {
    return (
      <div className="p-6 bg-zigama-50 border border-zigama-200 rounded-xl text-center">
        <div className="inline-flex items-center gap-2 text-zigama-800 text-sm font-medium">
          <Lightbulb className="w-4 h-4 animate-pulse" />
          Mwalimu is drawing your diagram
          <span className="inline-flex gap-1 ml-2">
            <span className="w-1.5 h-1.5 bg-zigama-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-zigama-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-zigama-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
        Could not generate diagram right now. The explanation above covers
        the same concept clearly.
        <button
          onClick={loadDiagram}
          className="ml-2 underline font-medium hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-warm-200 rounded-xl p-4 overflow-auto">
      <p className="text-xs text-warm-500 mb-3 flex items-center gap-1.5">
        <Network className="w-3 h-3" />
        Visual diagram: {moduleTitle}
      </p>
      <div ref={containerRef} className="w-full overflow-x-auto" />
    </div>
  );
}
