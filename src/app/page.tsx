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

      <section className="animate-fade-in px-6 pt-10 pb-20 flex flex-col items-center text-center gap-6 max-w-xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1]">
          Tagli precisi.
          <br />
          {/* text-accent on ink-950 fails WCAG contrast at this weight
              (2.19:1, needs 3:1) - the font change alone is enough of an
              accent; red stays reserved for the CTA per DESIGN.md. */}
          <span className="font-display text-5xl sm:text-6xl leading-none">
            Inchiostro deciso.
          </span>
        </h1>
        <p className="text-paper-50/70 text-lg max-w-sm">
          Prenota il tuo prossimo appuntamento da American Barber Tattoo in
          pochi secondi. Niente telefonate, niente attese.
        </p>
        <Link
          href="/login"
          className="h-14 px-10 rounded-lg bg-accent text-paper-50 font-semibold flex items-center justify-center transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
        >
          Prenota ora
        </Link>
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
                    {(service.price_cents / 100).toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-6 py-16 border-t border-paper-50/10 max-w-4xl mx-auto grid gap-8 sm:grid-cols-3">
        {VALUE_PROPS.map((prop) => (
          <div key={prop.title}>
            <p className="font-semibold mb-1">{prop.title}</p>
            <p className="text-paper-50/60 text-sm">{prop.body}</p>
          </div>
        ))}
      </section>

      <section className="px-6 py-16 border-t border-paper-50/10 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Dove siamo</h2>
        <div className="max-w-sm mx-auto rounded-lg bg-ink-900 border border-paper-50/15 p-4">
          <BusinessInfo />
        </div>
      </section>

      <footer className="px-6 py-10 border-t border-paper-50/10 flex flex-col items-center gap-3">
        <Image
          src="/brand/logo.png"
          alt="American Barber Tattoo"
          width={80}
          height={56}
          sizes="80px"
          className="w-16 h-auto opacity-70"
        />
        <Link href="/login" className="text-sm underline underline-offset-2 text-paper-50/60">
          Accedi
        </Link>
      </footer>
    </div>
  );
}
