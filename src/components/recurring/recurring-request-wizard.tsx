"use client";

import { useActionState, useState } from "react";
import {
  createRecurringBookingRequest,
  type RecurringActionState,
} from "@/lib/recurring/actions";

const initialState: RecurringActionState = { error: null };

const inputClass =
  "h-12 rounded-md bg-ink-900 border border-paper-50/15 px-3 text-paper-50 text-base focus:outline-none focus:border-accent w-full";

const WEEKDAY_LABELS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const INTERVAL_OPTIONS = [
  { value: "1", label: "Ogni settimana" },
  { value: "2", label: "Ogni 2 settimane" },
  { value: "3", label: "Ogni 3 settimane" },
  { value: "4", label: "Ogni 4 settimane" },
];

type Service = { id: string; name: string };

// One question per screen (section 79), not a single flat form - the
// script is literally CON CHI? / QUANDO? / OGNI QUANTO? / A CHE ORA? /
// DA: / A: / RIEPILOGO. Step 0 (service) isn't in that script but the
// schema needs it, so it's folded in as the natural first question.
export function RecurringRequestWizard({
  hairdresserName,
  hairdresserId,
  services,
}: {
  hairdresserName: string;
  hairdresserId: string;
  services: Service[];
}) {
  const [state, formAction, pending] = useActionState(
    createRecurringBookingRequest,
    initialState,
  );

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [weekday, setWeekday] = useState<number | null>(null);
  const [intervalWeeks, setIntervalWeeks] = useState("1");
  const [startTime, setStartTime] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  const service = services.find((s) => s.id === serviceId);
  const steps = [
    { label: "Servizio", valid: !!serviceId },
    { label: "Giorno", valid: weekday !== null },
    { label: "Frequenza", valid: !!intervalWeeks },
    { label: "Orario", valid: !!startTime },
    { label: "Data di inizio", valid: !!startsOn },
    { label: "Riepilogo", valid: true },
  ];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Second line of defense on top of the key="next"/key="submit" fix below:
  // if anything else ever causes a submit before the review step, this
  // stops it. Calling preventDefault() in a regular onSubmit alongside a
  // function `action` is a supported way to stop React from invoking the
  // action (React 19 form actions).
  function guardSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (step !== steps.length - 1) {
      e.preventDefault();
    }
  }

  // Belt-and-braces: pressing Enter in a text-like input implicitly submits
  // its form in every browser, even a form with no visible submit button
  // for the current step (the real one is just conditionally unmounted,
  // not absent from the form's notion of "how would this submit").
  function suppressEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={guardSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="hairdresserId" value={hairdresserId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="weekday" value={weekday ?? ""} />
      <input type="hidden" name="intervalWeeks" value={intervalWeeks} />
      <input type="hidden" name="startTime" value={startTime} />
      <input type="hidden" name="startsOn" value={startsOn} />
      <input type="hidden" name="endsOn" value={endsOn} />

      <p className="text-paper-50/40 text-sm">
        Passo {step + 1} di {steps.length}: {steps[step].label}
      </p>

      {step === 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Quale servizio?</h2>
          <div className="flex flex-col gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={`h-14 rounded-md border px-4 text-left ${
                  s.id === serviceId ? "border-accent bg-accent text-paper-50" : "bg-ink-900 border-paper-50/15"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Quale giorno, con {hairdresserName}?</h2>
          <div className="grid grid-cols-2 gap-2">
            {WEEKDAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setWeekday(i)}
                className={`h-14 rounded-md border ${
                  weekday === i ? "border-accent bg-accent text-paper-50" : "bg-ink-900 border-paper-50/15"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Con quale frequenza?</h2>
          <div className="flex flex-col gap-2">
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIntervalWeeks(opt.value)}
                className={`h-14 rounded-md border px-4 text-left ${
                  intervalWeeks === opt.value
                    ? "border-accent bg-accent text-paper-50"
                    : "bg-ink-900 border-paper-50/15"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">A che ora?</h2>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            onKeyDown={suppressEnter}
            className={inputClass}
          />
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">A partire da quando?</h2>
          <input
            type="date"
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            onKeyDown={suppressEnter}
            className={inputClass}
          />
          <h2 className="text-lg font-semibold mt-2">Fino a quando? (facoltativo)</h2>
          <input
            type="date"
            value={endsOn}
            onChange={(e) => setEndsOn(e.target.value)}
            onKeyDown={suppressEnter}
            className={inputClass}
          />
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Riepilogo</h2>
          <div className="rounded-md bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-1">
            <p>{hairdresserName}</p>
            <p className="text-paper-50/70 text-sm">{service?.name}</p>
            <p>
              Ogni {intervalWeeks !== "1" ? `${intervalWeeks} settimane` : "settimana"} di{" "}
              {weekday !== null ? WEEKDAY_LABELS[weekday] : ""} alle {startTime}
            </p>
            <p className="text-paper-50/60 text-sm">
              Dal {startsOn}
              {endsOn ? ` al ${endsOn}` : ""}
            </p>
          </div>
          <p className="text-paper-50/50 text-xs">
            Questa richiesta deve essere approvata da {hairdresserName} prima di essere confermata.
          </p>
        </div>
      )}

      {state.error && <p className="text-accent text-sm">{state.error}</p>}

      <div className="flex gap-3 mt-2">
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="h-12 px-4 rounded-md bg-ink-900 border border-paper-50/15 flex-1"
          >
            Indietro
          </button>
        )}
        {/* Explicit keys matter here, not just style: without them React
            reuses the same DOM node across the ternary and just mutates its
            type attribute from "button" to "submit" when the step changes -
            and if that mutation happens synchronously during the very click
            that caused it, the browser evaluates the click's default action
            against the now-mutated element and submits the form, even
            though nothing with type="submit" was ever actually clicked. */}
        {step < steps.length - 1 ? (
          <button
            key="next"
            type="button"
            onClick={next}
            disabled={!steps[step].valid}
            className="h-12 px-4 rounded-md bg-accent text-paper-50 font-medium flex-1 disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            Avanti
          </button>
        ) : (
          <button
            key="submit"
            type="submit"
            disabled={pending}
            className="h-12 px-4 rounded-md bg-accent text-paper-50 font-medium flex-1 disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            {pending ? "..." : "Invia richiesta"}
          </button>
        )}
      </div>
    </form>
  );
}
