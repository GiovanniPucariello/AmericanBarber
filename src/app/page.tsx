import Image from "next/image";
import Link from "next/link";
// Only this page uses the display font - importing it here rather than the
// root layout keeps it off every other route's render-blocking CSS.
import "@fontsource/pirata-one/400.css";
import { createPublicClient } from "@/lib/supabase/public";
import { getPublicOrganization } from "@/lib/organizations/queries";
import { BusinessInfo } from "@/components/info/business-info";

// Real but slow-changing data (org name, service list/prices) - ISR instead
// of making the whole page dynamic per request (section 61, caching).
export const revalidate = 3600;

const DEFAULT_ORG_SLUG = process.env.DEFAULT_ORG_SLUG;

const VALUE_PROPS = [
  {
    title: "Mai una doppia prenotazione",
    body: "È il database stesso a garantire che il tuo posto sia tuo - non un foglio di calcolo, non una speranza.",
  },
  {
    title: "Barbieri veri, rapporti veri",
    body: "Prenota con chi conosce il tuo taglio, non con chi capita libero.",
  },
  {
    title: "Prenotato in pochi secondi",
    body: "Scegli un orario, conferma, fatto. Niente telefonate, niente attese.",
  },
];

// Static portraits in public/team - not the hairdressers table, so the
// landing page stays renderable without a DB round trip.
const TEAM: { name: string; instagram?: string }[] = [
  { name: "angelo", instagram: "angelobarberscarlatella" },
  { name: "cimbone", instagram: "tonti.alessandro" },
  { name: "fede" },
  { name: "luigi" },
  { name: "vito" },
];

const SHOP_INSTAGRAM = "americanbarbertattoofoggia";
const GOOGLE_MAPS_URL = "https://www.google.com/maps/search/?api=1&query=AmericanBarberTatoo%20Foggia";

// Short excerpts of real Google reviews (checked 28 Sep 2026: 5,0 from 10
// reviews). Static on purpose - the Places API needs a billed key. Update
// by hand when new reviews come in.
const GOOGLE_RATING = { score: "5,0", count: 10 };
const REVIEWS = [
  { author: "Luigi P.", text: "…ho trovato chi mi ha fatto ad oggi il taglio più bello in Foggia." },
  { author: "Max S.", text: "Ambiente caloroso, ragazzi giovani e pieni di passione, con grande talento e attenzione ai dettagli." },
  { author: "Antonio R.", text: "Locale veramente full optional, ragazzi educati e soprattutto molto ma molto delicati." },
];

type PublicService = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
};

export default async function Home() {
  const orgSlug = DEFAULT_ORG_SLUG;
  const organization = orgSlug ? await getPublicOrganization(orgSlug) : null;

  let services: PublicService[] = [];
  if (organization) {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents")
      .eq("organization_id", organization.id)
      .eq("active", true)
      .order("sort_order")
      .limit(6);
    services = data ?? [];
  }

  return (
    <div className="min-h-screen text-paper-50">
      <header className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
        <Image
          src="/brand/logo.png"
          alt="American Barber Tattoo"
          width={112}
          height={78}
          priority
          fetchPriority="high"
          sizes="112px"
          className="w-24 h-auto"
        />
        <Link href="/login" className="text-sm underline underline-offset-2 text-paper-50/80">
          Accedi
        </Link>
      </header>

      <section className="animate-fade-in px-6 pt-12 pb-24 sm:pt-20 sm:pb-32 flex flex-col items-center text-center gap-7 max-w-3xl mx-auto">
        <h1 className="flex flex-col items-center gap-2">
          <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-paper-50/80">
            Tagli precisi.
          </span>
          {/* text-accent on ink-950 fails WCAG contrast at this weight
              (2.19:1, needs 3:1) - the font change alone is enough of an
              accent; red stays reserved for the CTA per DESIGN.md. */}
          <span className="font-display font-normal text-6xl sm:text-8xl leading-[0.95] [text-shadow:0_0_24px_rgba(245,243,239,0.25)]">
            Inchiostro deciso.
          </span>
        </h1>
        <p className="text-paper-50/70 text-lg max-w-md">
          Barberia e tattoo studio a Foggia. Scegli il tuo barbiere, scegli
          l&apos;orario, conferma. Niente telefonate, niente attese.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/login"
            className="h-14 w-full sm:w-auto px-10 rounded-lg bg-accent text-paper-50 font-semibold flex items-center justify-center shadow-[0_8px_30px_-8px_rgba(140,31,40,0.8)] transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper-50"
          >
            Prenota ora
          </Link>
          <a
            href="tel:+393519131549"
            className="h-14 w-full sm:w-auto px-8 rounded-lg border border-paper-50/25 bg-ink-950/60 text-paper-50 font-medium flex items-center justify-center transition-colors hover:border-paper-50/60"
          >
            Chiama 351 913 1549
          </a>
        </div>
      </section>

      <section className="py-12 sm:py-16 border-t border-paper-50/10 bg-ink-950/80">
        <div className="max-w-5xl mx-auto px-6 mb-6">
          <h2 className="font-display text-4xl sm:text-5xl">Il team</h2>
          <p className="text-paper-50/60 mt-1">Prenota con chi conosce il tuo taglio.</p>
        </div>
        {/* Swipe row on phones (next card peeks in to hint at scrolling),
            plain 5-up grid from sm up - CSS only. scroll-pl keeps snapped
            cards aligned with the page gutter instead of the screen edge. */}
        <ul className="flex sm:grid sm:grid-cols-5 gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-6 px-6 max-w-5xl mx-auto no-scrollbar">
          {TEAM.map(({ name, instagram }) => (
            <li key={name} className="snap-start shrink-0 w-[42%] sm:w-auto">
              <figure className="relative rounded-md overflow-hidden border border-paper-50/15 bg-ink-900">
                <Image
                  src={`/team/${name}.png`}
                  alt={`Ritratto di ${name}`}
                  width={400}
                  height={400}
                  sizes="(min-width: 640px) 200px, 42vw"
                  className="w-full h-auto aspect-[4/5] object-cover"
                />
                <figcaption className="absolute inset-x-0 bottom-0 px-3 pt-8 pb-2.5 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent">
                  <span className="block font-semibold capitalize">{name}</span>
                  {instagram && (
                    <a
                      href={`https://instagram.com/${instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-paper-50/70 underline underline-offset-2 truncate py-1"
                    >
                      @{instagram}
                    </a>
                  )}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      {services.length > 0 && (
        <section className="px-6 py-16 border-t border-paper-50/10 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Cosa offriamo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-lg bg-ink-900 border border-paper-50/15 p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-paper-50/50 text-sm">{service.duration_minutes} min</p>
                </div>
                {service.price_cents != null && (
                  <p className="text-paper-50/80 font-medium shrink-0">
                    €{(service.price_cents / 100).toFixed(2).replace(".", ",")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-6 py-12 sm:py-16 max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="font-display text-4xl sm:text-5xl">Dicono di noi</h2>
          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-right shrink-0"
          >
            <span className="block text-2xl font-semibold tabular-nums">
              {GOOGLE_RATING.score} <span className="text-lg" aria-hidden>★★★★★</span>
            </span>
            <span className="block text-xs text-paper-50/60 underline underline-offset-2">
              {GOOGLE_RATING.count} recensioni su Google
            </span>
          </a>
        </div>
        <ul className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-6 -mx-6 px-6 sm:mx-0 sm:px-0 no-scrollbar">
          {REVIEWS.map((review) => (
            <li
              key={review.author}
              className="snap-start shrink-0 w-[80%] sm:w-auto rounded-lg bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-3"
            >
              <span className="text-sm" aria-label="5 stelle su 5">★★★★★</span>
              <blockquote className="text-paper-50/85 leading-relaxed">&ldquo;{review.text}&rdquo;</blockquote>
              <p className="text-sm text-paper-50/50 mt-auto">{review.author}, su Google</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto grid gap-8 sm:grid-cols-3">
        {VALUE_PROPS.map((prop) => (
          <div key={prop.title} className="border-t-2 border-accent pt-4">
            <p className="font-semibold mb-1">{prop.title}</p>
            <p className="text-paper-50/60 text-sm">{prop.body}</p>
          </div>
        ))}
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="font-display text-4xl sm:text-5xl mb-8">Dove siamo</h2>
        <div className="rounded-lg bg-ink-900 border border-paper-50/15 p-6">
          <BusinessInfo />
        </div>
      </section>

      <footer className="px-6 py-10 border-t border-paper-50/10 bg-ink-950/80 flex flex-col items-center gap-3">
        <Image
          src="/brand/logo.png"
          alt="American Barber Tattoo"
          width={80}
          height={56}
          sizes="80px"
          className="w-16 h-auto opacity-70"
        />
        <a
          href={`https://instagram.com/${SHOP_INSTAGRAM}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline underline-offset-2 text-paper-50/80 py-2"
        >
          Seguici su Instagram @{SHOP_INSTAGRAM}
        </a>
        <div className="flex gap-6">
          <Link href="/login" className="text-sm underline underline-offset-2 text-paper-50/60 py-2">
            Accedi
          </Link>
          <Link href="/privacy" className="text-sm underline underline-offset-2 text-paper-50/60 py-2">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
