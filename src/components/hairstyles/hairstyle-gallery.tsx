"use client";

import { useRef, useState } from "react";
import Image from "next/image";

// Images live in public/hairstyles/<folder>/<n>.webp, generated from
// img_utils/HairStyles by scripts/process-hairstyles.py. Names are the
// titles that were baked into the original images.
const CATEGORIES = [
  {
    id: "american-fade",
    name: "American Fade",
    folder: "AmericanFade",
    styles: ["Pompadour", "Taper Fade", "Low Taper", "Low Taper Fade", "Blowout Taper"],
  },
  {
    id: "buzz-cut",
    name: "Buzz Cut",
    folder: "BuzzCut",
    styles: ["Low Cut", "Afro Low Cut", "Low Fade", "Buzz Cut"],
  },
  {
    id: "mullet",
    name: "Mullet",
    folder: "Mullet",
    styles: ["Modern Mullet", "Modern Mullet", "Mullet", "Mullet", "Mullet", "Mullet", "Mullet"],
  },
  {
    id: "old-school",
    name: "Old School",
    folder: "OldSchool",
    styles: ["Side Part", "Middle Part", "Classico a strati", "Pompadour"],
  },
  {
    id: "razor-fade",
    name: "Razor Fade",
    folder: "RazorFade",
    styles: ["High Taper Fade", "Taper Fade con barba", "Side Part", "Mid Taper Fade", "Slick Back", "Mid Fade"],
  },
];

// Shared by the customer (/app/styles) and barber (/hairdresser/styles)
// areas - a catalogue to point at while agreeing on the cut.
export function HairstyleGallery() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<{ src: string; name: string } | null>(null);
  const [activeId, setActiveId] = useState(CATEGORIES[0].id);
  const active = CATEGORIES.find((c) => c.id === activeId) ?? CATEGORIES[0];

  const show = (src: string, name: string) => {
    setOpen({ src, name });
    dialogRef.current?.showModal();
  };

  return (
    <div className="pb-6 flex flex-col">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-xl font-semibold">Stili di taglio</h1>
        <p className="text-paper-50/60 text-sm">Mostralo al barbiere per scegliere insieme il tuo taglio.</p>
      </div>

      {/* Sticks right under the TopBar (h-14 + safe area). One scrollable
          row instead of wrapping chips, so the grid starts higher. */}
      <div
        role="tablist"
        aria-label="Categorie"
        className="sticky z-10 flex gap-2 overflow-x-auto px-6 py-3 bg-ink-950/90 backdrop-blur [scrollbar-width:none]"
        style={{ top: "calc(3.5rem + env(safe-area-inset-top))" }}
      >
        {CATEGORIES.map((c) => {
          const selected = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(c.id)}
              className={`h-10 px-4 shrink-0 rounded-full text-sm font-medium transition-colors ${
                selected ? "bg-accent text-paper-50" : "border border-paper-50/15 bg-ink-900 text-paper-50/80"
              }`}
            >
              {c.name}
              <span className={`ml-1.5 ${selected ? "text-paper-50/80" : "text-paper-50/40"}`}>{c.styles.length}</span>
            </button>
          );
        })}
      </div>

      <ul role="tabpanel" aria-label={active.name} className="px-6 pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {active.styles.map((name, i) => (
          <li key={`${active.id}-${i}`}>
            <button
              type="button"
              onClick={() => show(`/hairstyles/${active.folder}/${i + 1}.webp`, name)}
              aria-label={`Apri a schermo intero: ${name}`}
              className="relative block w-full rounded-xl overflow-hidden ring-1 ring-paper-50/10 bg-ink-900 active:scale-[0.98] transition-transform"
            >
              <Image
                src={`/hairstyles/${active.folder}/${i + 1}.webp`}
                alt={`${active.name}: ${name}`}
                width={800}
                height={1000}
                sizes="(min-width: 640px) 200px, 45vw"
                className="w-full h-auto aspect-[4/5] object-cover brightness-90"
              />
              <span className="absolute inset-x-0 bottom-0 px-3 pt-8 pb-2.5 text-left text-sm font-semibold text-paper-50 truncate bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent">
                {name}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Native modal (Esc closes it for free). A tap anywhere - image, X or
          backdrop - closes it too, since there is nothing to interact with. */}
      <dialog
        ref={dialogRef}
        onClick={() => dialogRef.current?.close()}
        onClose={() => setOpen(null)}
        aria-label={open?.name}
        className="m-0 p-0 w-screen h-dvh max-w-none max-h-none bg-ink-950 backdrop:bg-ink-950/90"
      >
        {open && (
          <div className="h-full flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-between px-4 h-14 text-paper-50">
              <span className="font-semibold">{open.name}</span>
              <button type="button" aria-label="Chiudi" className="h-11 w-11 -mr-2 text-xl">
                ✕
              </button>
            </div>
            <div className="relative flex-1">
              <Image src={open.src} alt={open.name} fill sizes="100vw" className="object-contain" />
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
