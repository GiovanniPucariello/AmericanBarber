"use client";

// Only fires if the root layout itself throws (fonts, providers) - has to
// render its own <html>/<body> since it replaces the entire root layout
// when active. Deliberately has zero dependencies on anything that could
// itself be the thing that broke.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="it">
      <body style={{ background: "#0B0B0C", color: "#F5F3EF", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Qualcosa è andato storto</h1>
          <p style={{ color: "rgba(245,243,239,0.7)", maxWidth: 320 }}>
            Non è colpa tua. Nulla è andato perso - riprova tra un momento.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: "3rem",
              padding: "0 1.5rem",
              borderRadius: "0.375rem",
              background: "#8C1F28",
              color: "#F5F3EF",
              fontWeight: 500,
              border: "none",
            }}
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
