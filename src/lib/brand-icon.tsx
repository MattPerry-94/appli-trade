import { ImageResponse } from "next/og";

/** Icône de l'application (boussole), générée en PNG. */
export function brandIcon(size: number, maskable = false) {
  const pad = maskable ? size * 0.2 : size * 0.12;
  const inner = size - pad * 2;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f5f1" }}>
        <svg width={inner} height={inner} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="#16150f" strokeWidth="1.6" />
          <path d="M12 4.5 14.2 12 12 19.5 9.8 12Z" fill="#2459c4" />
          <path d="M12 12 14.2 12 12 19.5Z" fill="#16150f" opacity="0.85" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
