"use client";

import { useState, type ReactNode } from "react";

export function Expandable({ children, lines = 5 }: { children: ReactNode; lines?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {children}
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="link text-sm mt-1">
        {open ? "Réduire" : "Lire la suite"}
      </button>
    </div>
  );
}
