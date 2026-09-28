import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy - American Barber Tattoo" };

// DRAFT privacy notice (GDPR art. 13). Fields marked with <Todo> must be
// filled in and the whole text reviewed by a professional before launch.
function Todo({ children }: { children: React.ReactNode }) {
  return <mark className="bg-accent/30 text-paper-50 px-1 rounded-sm">[{children}]</mark>;
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-paper-50">
      <article className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6 leading-relaxed text-paper-50/85">
        <Link href="/" className="text-sm underline underline-offset-2 text-paper-50/60">
          Torna al sito
        </Link>
        <h1 className="text-2xl font-bold text-paper-50">Informativa sulla privacy</h1>
        <p className="text-sm text-paper-50/50">Ultimo aggiornamento: <Todo>data</Todo></p>

        <Section title="Chi tratta i tuoi dati">
          <p>
            Titolare del trattamento è American Barber&amp;Tattoo di Scarlatella Angelo, Viale Giuseppe la
            Torre 304, 71122 Foggia (FG), P.IVA <Todo>partita IVA</Todo>. Per qualsiasi richiesta sulla
            privacy scrivi a <Todo>email di contatto</Todo>.
          </p>
        </Section>

        <Section title="Quali dati raccogliamo">
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Nome, email e, se lo inserisci, numero di telefono (visibile solo allo staff del negozio).</li>
            <li>Appuntamenti prenotati, annullati e prenotazioni ricorrenti.</li>
            <li>Messaggi scambiati con il barbiere su un appuntamento.</li>
            <li>Barbiere preferito e richieste &quot;avvisami se si libera&quot;.</li>
            <li>
              Note del barbiere sulle tue preferenze di taglio, visibili solo allo staff.
            </li>
          </ul>
        </Section>

        <Section title="Perché e su quale base">
          <p>
            Usiamo i dati solo per gestire le tue prenotazioni e comunicare con te sugli appuntamenti
            (esecuzione del servizio richiesto, art. 6.1.b GDPR). Non li vendiamo, non li usiamo per
            pubblicità e non li cediamo a terzi, salvo i fornitori tecnici indicati sotto.
          </p>
        </Section>

        <Section title="Dove sono conservati">
          <p>
            I dati sono ospitati da Supabase (database e accesso) e dal fornitore che pubblica il sito
            <Todo>Vercel / Cloudflare</Todo>, che agiscono come responsabili del trattamento. Regione dei
            server: <Todo>regione del progetto Supabase</Todo>. Se accedi con Google, Google tratta i dati di
            accesso secondo la propria informativa.
          </p>
        </Section>

        <Section title="Per quanto tempo">
          <p>
            Conserviamo i dati finché il tuo account è attivo. Se elimini l&apos;account dal tuo profilo,
            cancelliamo subito dati personali, appuntamenti, messaggi e note collegati.
          </p>
        </Section>

        <Section title="I tuoi diritti">
          <p>
            Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità dei dati e opporti
            al trattamento (artt. 15-22 GDPR). Nome e telefono li modifichi dal profilo; puoi eliminare
            l&apos;account in qualsiasi momento dal profilo. Hai anche diritto di reclamo al Garante per la
            protezione dei dati personali (garanteprivacy.it).
          </p>
        </Section>

        <Section title="Cookie">
          <p>
            Usiamo solo cookie tecnici necessari per tenerti connesso. Nessun cookie di profilazione o
            di statistica.
          </p>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-paper-50">{title}</h2>
      {children}
    </section>
  );
}
