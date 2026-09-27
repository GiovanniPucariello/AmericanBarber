import Image from "next/image";
import Link from "next/link";

// Sticky in-flow header shared by the logged-in areas. Replaces the old
// fixed "Notifiche" pill, which floated over every page's own heading.
// Safe-area top padding because the PWA uses a black-translucent status bar.
export function TopBar({ homeHref, children }: { homeHref: string; children?: React.ReactNode }) {
  return (
    <header
      className="sticky top-0 z-20 bg-ink-950/90 backdrop-blur border-b border-paper-50/10"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="h-14 px-4 flex items-center justify-between max-w-2xl mx-auto">
        <Link href={homeHref} aria-label="Home">
          <Image src="/brand/logo.png" alt="American Barber Tattoo" width={72} height={50} sizes="72px" className="w-[60px] h-auto" priority />
        </Link>
        {children}
      </div>
    </header>
  );
}
