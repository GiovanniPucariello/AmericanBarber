import Image from "next/image";
import Link from "next/link";
// Only this page uses the display font - importing it here rather than the
// root layout keeps it off every other route's render-blocking CSS.
import "@fontsource/pirata-one/400.css";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { NavIcon } from "@/components/layout/nav-icon";
import { getPublicOrganization } from "@/lib/organizations/queries";
import { ADDRESS, BusinessInfo } from "@/components/info/business-info";

// Real but slow-changing data (org name, service list/prices) - ISR instead
// of making the whole page dynamic per request (section 61, caching).
export const revalidate = 3600;

const DEFAULT_ORG_SLUG = process.env.DEFAULT_ORG_SLUG;

// Static portraits in public/team (who appears, and in what order). The
// Instagram handles come from the hairdressers table, matched by name, so a
// barber editing their own handle shows up here too.
const TEAM = ["cimbone", "fede", "luigi", "vito"];

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
  const instagramByName = new Map<string, string>();
  if (organization) {
    const supabase = createPublicClient();
    // hairdressers is members-only under RLS; the service-role read is
    // limited to two public columns that the booking page already shows.
    const [{ data }, { data: barbers }] = await Promise.all([
      supabase
        .from("services")
        .select("id, name, duration_minutes, price_cents")
        .eq("organization_id", organization.id)
        .eq("active", true)
        .order("sort_order")
        .limit(6),
      createAdminClient()
        .from("hairdressers")
        .select("display_name, instagram_handle")
        .eq("organization_id", organization.id)
        .not("instagram_handle", "is", null),
    ]);
    services = data ?? [];
    for (const b of barbers ?? []) {
      instagramByName.set(b.display_name.toLowerCase(), b.instagram_handle!);
    }
  }

  return (
    <div className="min-h-screen text-paper-50">
      <header
        className="sticky top-0 z-20 border-b border-paper-50/10 bg-ink-950/85 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14 max-w-5xl mx-auto">
          <a
            href={`https://instagram.com/${SHOP_INSTAGRAM}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 min-w-0 h-11 text-sm text-paper-50/85 hover:text-paper-50 transition-colors"
          >
            <NavIcon name="instagram" className="w-5 h-5 shrink-0" />
            <span className="truncate">@{SHOP_INSTAGRAM}</span>
          </a>
          <Link
            href="/login"
            className="shrink-0 h-9 px-4 rounded-full border border-paper-50/25 text-sm font-medium flex items-center transition-colors hover:border-paper-50/60"
          >
            Accedi
          </Link>
        </div>
      </header>

      <section className="animate-fade-in px-6 pt-12 pb-24 sm:pt-20 sm:pb-32 flex flex-col items-center text-center gap-7 max-w-3xl mx-auto">
        <h1>
          <Image
            src="/brand/logo.png"
            alt="American Barber Tattoo"
            width={998}
            height={698}
            priority
            fetchPriority="high"
            sizes="(min-width: 640px) 512px, 90vw"
            className="w-full max-w-lg h-auto"
          />
        </h1>
        <p className="text-paper-50/70 text-lg max-w-md">
          Barberia e tattoo studio a Foggia.
          <br />
          Prenota il tuo taglio online.
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
            plain 4-up grid from sm up - CSS only. scroll-pl keeps snapped
            cards aligned with the page gutter instead of the screen edge. */}
        <ul className="flex sm:grid sm:grid-cols-4 gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-6 px-6 max-w-5xl mx-auto no-scrollbar">
          {TEAM.map((name) => {
            const instagram = instagramByName.get(name);
            return (
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
            );
          })}
        </ul>
      </section>

      {services.length > 0 && (
        <section className="px-6 py-16 border-t border-paper-50/10 max-w-4xl mx-auto">
          <h2 className="font-display text-4xl sm:text-5xl mb-8">Cosa offriamo</h2>
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
              {GOOGLE_RATING.score}{" "}
              <span className="inline-flex align-middle" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <NavIcon key={i} name="star" className="w-4 h-4 fill-current" />
                ))}
              </span>
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
              <blockquote className="text-paper-50/85 leading-relaxed">&ldquo;{review.text}&rdquo;</blockquote>
              <p className="text-sm text-paper-50/50 mt-auto">{review.author}, su Google</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="font-display text-4xl sm:text-5xl mb-8">Dove siamo</h2>
        <div className="rounded-lg bg-ink-900 border border-paper-50/15 p-6">
          <BusinessInfo />
        </div>
        {/* Keyless embed URL - the Maps Embed API would need a billed key. */}
        <iframe
          title="Mappa: American Barber Tattoo"
          src={`https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="mt-3 w-full h-72 sm:h-96 rounded-lg border border-paper-50/15 bg-ink-900"
        />
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
