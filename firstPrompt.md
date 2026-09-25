Assolutamente. Ti preparo una **V3 definitiva**, pensata per essere incollata direttamente in Claude Sonnet dentro il progetto.

Ho fatto una scelta precisa: **American Barber Tattoo è il prodotto reale da costruire, ma sotto il cofano l'app deve essere già multi-tenant/SaaS-ready**. E soprattutto ho reso **MOBILE FIRST un vincolo architetturale e di design**, non una semplice preferenza.

Ho incluso anche indicazioni per evitare uno degli errori più comuni di Claude/code agent: partire subito a creare componenti senza aver prima progettato database, autorizzazioni e booking engine.

---

# PROMPT DEFINITIVO — AMERICAN BARBER TATTOO

Copia tutto quello che segue e incollalo in Claude Sonnet:

```text
# AMERICAN BARBER TATTOO
## Booking Platform — Master Development Prompt

---

# 0. IL TUO RUOLO

Agisci come un team composto da:

- Senior Full-Stack Engineer
- Senior React / Next.js Engineer
- Software Architect
- PostgreSQL / Supabase Expert
- UX/UI Designer specializzato in mobile app
- Product Designer
- PWA Expert
- Security Engineer
- QA Engineer

Devi sviluppare un prodotto software reale e production-ready.

NON voglio un semplice mockup.

NON voglio una dashboard generica da template.

NON voglio una desktop web app semplicemente resa responsive.

Voglio una vera esperienza mobile-first, installabile come PWA, progettata per essere utilizzata quotidianamente da smartphone.

Il prodotto iniziale è:

# AMERICAN BARBER TATTOO

Si tratta di una web app per la gestione delle prenotazioni di un barber shop / salone.

---

# 1. REGOLA ASSOLUTA: MOBILE FIRST

## QUESTA È LA PRIORITÀ NUMERO 1 DEL PROGETTO.

Ripeto:

# MOBILE FIRST.

Il progetto deve essere concepito inizialmente per:

- smartphone
- touch interaction
- utilizzo con una mano
- viewport piccoli
- connessioni mobili
- tastiere virtuali
- gesture
- schermate verticali

NON progettare prima desktop.

NON creare una desktop UI e poi aggiungere media query.

Il processo corretto deve essere:

MOBILE
↓
TABLET
↓
DESKTOP

Ogni schermata deve essere progettata prima nella sua versione mobile.

Solo successivamente deve essere adattata a viewport più grandi.

---

# 2. OBIETTIVO DEL PRODOTTO

L'app permette ai clienti di American Barber Tattoo di:

- creare un account
- accedere rapidamente
- vedere i professionisti
- scegliere un professionista
- scegliere una data
- scegliere un orario disponibile
- creare una prenotazione
- creare una prenotazione ricorrente
- visualizzare i propri appuntamenti
- cancellare appuntamenti
- ricevere notifiche
- gestire il proprio profilo

I professionisti devono poter:

- accedere alla propria area
- vedere il calendario
- vedere gli appuntamenti
- vedere le richieste
- accettare/rifiutare prenotazioni ricorrenti
- gestire disponibilità
- bloccare slot
- gestire assenze
- gestire eccezioni alle ricorrenze

Un admin deve poter:

- gestire il salone
- gestire i professionisti
- gestire gli utenti
- vedere gli appuntamenti
- configurare impostazioni
- gestire il branding

---

# 3. BRAND

Il brand è:

# American Barber Tattoo

Il logo ufficiale fornito nel progetto deve essere considerato una fonte primaria per la direzione artistica.

Il logo comunica una forte estetica:

- American traditional
- tattoo
- barber
- blackletter / gothic
- old school
- ornamentale
- forte contrasto
- nero e bianco
- vintage
- deciso
- riconoscibile

L'interfaccia digitale deve tradurre questa identità in un prodotto moderno.

IMPORTANTE:

NON copiare letteralmente il logo in ogni componente.

Il logo è complesso.

La UI deve essere semplice.

Il risultato deve essere:

# "American Barber Tattoo trasformato in una moderna app mobile"

e NON:

# "un gestionale SaaS con il logo di American Barber Tattoo sopra".

---

# 4. PRINCIPIO DESIGN FONDAMENTALE

Deve esserci un contrasto tra:

## BRANDING

Ricco, caratterizzato, tattoo-inspired, ornamentale.

e:

## UX

Minimalista, veloce, pulita, intuitiva.

Questa è una regola fondamentale.

Il logo può essere elaborato.

Il calendario NON deve esserlo.

Il lettering può essere decorativo.

I pulsanti devono essere leggibili.

La home può avere personalità.

Il flow di prenotazione deve essere estremamente semplice.

---

# 5. DESIGN LANGUAGE

Costruisci un design system coerente con il logo.

Direzione estetica:

- black
- off-black
- white
- off-white
- grigi profondi
- eventuale accent color derivato dal branding

Non aggiungere colori casuali.

Se utilizzi un colore accent, deve essere utilizzato con moderazione.

Il design deve comunicare:

- barber culture
- tattoo culture
- premium
- old school
- modern
- confident
- masculine
- sophisticated
- memorable

Evita completamente:

- estetica SaaS generica
- colori pastello
- UI troppo "corporate"
- neon
- gradienti casuali
- glassmorphism eccessivo
- estetica crypto/web3
- interfacce troppo colorate
- componenti enormi inutilmente
- font gotici usati per tutto

---

# 6. TIPOGRAFIA

Il logo utilizza una tipografia altamente caratterizzata.

NON utilizzare un font blackletter/gothic per:

- form
- pulsanti
- date
- orari
- menu
- informazioni
- body text
- calendario
- error messages

Per la UI usa una sans-serif moderna, leggibile e professionale.

Il font decorativo può essere utilizzato esclusivamente per:

- branding
- hero
- titoli particolari
- splash screen
- sezioni decorative

La leggibilità viene prima dell'estetica.

---

# 7. LOGO

Il logo deve essere utilizzato correttamente.

NON deformarlo.

NON cambiarne arbitrariamente le proporzioni.

NON utilizzare il logo come semplice decorazione ovunque.

Prevedi:

- logo completo
- eventuale versione compatta
- favicon
- app icon
- splash screen

Se il logo completo non è adatto alle dimensioni molto piccole, prevedi una variante compatta o un simbolo dedicato.

Mantieni comunque la coerenza con il brand.

---

# 8. ARCHITETTURA SAAS-READY

Questa decisione è FONDAMENTALE.

Il primo cliente del sistema è:

# American Barber Tattoo

Tuttavia l'architettura deve essere progettata fin dall'inizio come:

# MULTI-TENANT

Non voglio però costruire subito un enorme SaaS enterprise.

Voglio:

# MVP semplice + architettura SaaS-ready

---

# 9. CONCETTO DI TENANT

Introduci il concetto di:

# Organization

Ogni barber shop / salone è una Organization.

La prima organization è:

American Barber Tattoo

In futuro potrebbe esistere:

- Barber Shop Rossi
- Hair Studio Milano
- Barber Club Roma
- ecc.

Il codice non deve assumere che esista una sola organization.

---

# 10. MODELLO CONCETTUALE

Architettura:

Platform
│
├── Organization
│   ├── Branding
│   ├── Locations
│   ├── Staff
│   ├── Services
│   ├── Customers
│   ├── Availability
│   ├── Appointments
│   ├── Recurring Bookings
│   └── Notifications
│
├── Organization
│   └── ...
│
└── Organization
    └── ...

American Barber Tattoo sarà il primo tenant.

---

# 11. FUTURO WHITE LABEL

Non implementare ora billing o abbonamenti.

Ma l'architettura deve consentire in futuro:

- branding personalizzato
- logo personalizzato
- colori personalizzati
- favicon personalizzata
- app icon personalizzata
- dominio personalizzato
- subdomain
- servizi personalizzati
- configurazioni personalizzate

Esempio futuro:

americanbarbertattoo.it

oppure:

americanbarbertattoo.platform.com

oppure:

barbershoprossi.platform.com

oppure:

booking.barbershoprossi.it

Il sistema deve poter determinare il tenant attraverso:

- organization ID
- authenticated user
- slug
- domain
- subdomain

senza hardcodare American Barber Tattoo nella business logic.

---

# 12. REGOLA DI CODING MULTI-TENANT

NON fare:

const hairdressers = [
  "Angelo",
  "Cimbone",
  "Vito",
  "Fede"
]

NON fare:

if (salon === "American Barber Tattoo") {
   ...
}

NON hardcodare dati business nel frontend.

I dati devono arrivare dal database.

American Barber Tattoo deve essere configurato come dati.

---

# 13. STACK TECNOLOGICO

Utilizza preferibilmente:

## Frontend

- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS

## UI

Puoi utilizzare shadcn/ui come base per primitive accessibili, ma NON lasciare che il risultato sembri una demo shadcn.

Personalizza completamente:

- colori
- radius
- shadows
- typography
- spacing
- states
- animations

## Backend / Database

- Supabase
- PostgreSQL

## Authentication

Supabase Auth con:

- Google OAuth
- Email/password
- Magic Link, se appropriato

## PWA

Utilizza una soluzione moderna e stabile compatibile con Next.js.

---

# 14. PRIMA DI CODIFICARE

NON iniziare immediatamente a creare tutte le pagine.

Prima esegui:

## STEP 1

Analizza i requisiti.

## STEP 2

Definisci architettura.

## STEP 3

Definisci database.

## STEP 4

Definisci RLS.

## STEP 5

Definisci booking engine.

## STEP 6

Definisci recurring booking engine.

## STEP 7

Definisci user flows.

## STEP 8

Definisci design system.

## STEP 9

Definisci file structure.

## STEP 10

Solo a questo punto inizia l'implementazione.

---

# 15. DATABASE

Progetta un database relazionale professionale.

Come minimo valuta queste entità:

organizations

profiles

organization_members

hairdressers

locations

services

availability_rules

availability_exceptions

blocked_slots

appointments

recurring_bookings

recurring_booking_occurrences

notifications

audit_logs

Non necessariamente tutte devono essere utilizzate immediatamente.

Spiega la necessità di ciascuna.

---

# 16. ORGANIZATIONS

Tabella:

organizations

Campi concettuali:

- id UUID
- name
- slug
- logo_url
- favicon_url
- primary_color
- secondary_color
- accent_color
- timezone
- locale
- settings JSONB
- created_at
- updated_at

American Barber Tattoo deve essere il seed iniziale.

---

# 17. USERS

Separare:

# User identity

da:

# Organization membership

Un utente può teoricamente appartenere a più organization.

Quindi NON assumere:

user = customer di un solo salone

Prevedi una relazione:

users / profiles

e:

organization_members

---

# 18. RUOLI

Supporta almeno:

- customer
- hairdresser
- manager
- admin
- owner

Per l'MVP possono essere utilizzati principalmente:

customer
hairdresser
admin

ma non costruire il sistema in modo da impedire l'aggiunta degli altri ruoli.

---

# 19. PARRUCCHIERI

American Barber Tattoo parte con:

- Angelo
- Cimbone
- Vito
- Fede

Ogni professionista deve essere un record del database.

NON hardcodare questi nomi nel frontend.

Prevedi almeno:

- id
- organization_id
- profile/user reference
- display_name
- avatar_url
- bio
- active
- sort_order
- created_at
- updated_at

---

# 20. LOCATION

Prevedi già il concetto di location.

Per ora:

American Barber Tattoo
→ una location

In futuro:

American Barber Tattoo
→ Location 1
→ Location 2
→ Location 3

Questo permette di evolvere in futuro senza rifare il database.

---

# 21. SERVICES

Anche se l'MVP iniziale utilizzerà slot da 30 minuti, NON hardcodare la durata di 30 minuti in tutto il sistema.

Prevedi una tabella:

services

con:

- id
- organization_id
- name
- description
- duration_minutes
- price
- active
- sort_order

Per l'MVP puoi creare servizi con:

duration_minutes = 30

ma il booking engine deve essere costruito in modo da poter supportare in futuro:

15
30
45
60
90
120

ecc.

---

# 22. BOOKING ENGINE

Il booking engine è una parte critica.

Deve garantire:

# ZERO DOUBLE BOOKING

Il frontend può mostrare la disponibilità.

MA il backend/database deve essere l'autorità finale.

Non affidarti al solo frontend.

---

# 23. SLOT

Per l'MVP:

# SLOT = 30 MINUTI

Esempio:

09:00
09:30
10:00
10:30
11:00
11:30

ecc.

La durata deve comunque essere configurabile tramite services.

---

# 24. TIMEZONE

Il salone opera in Italia.

Default:

Europe/Rome

La timezone deve essere configurabile per organization.

Gestisci correttamente:

- date
- timezone
- DST
- ora legale
- conversioni

NON usare logiche fragili basate su semplici stringhe.

---

# 25. PRENOTAZIONE CLASSICA

Il customer:

1. sceglie professionista
2. sceglie servizio, se disponibile
3. sceglie data
4. vede disponibilità
5. sceglie orario
6. vede riepilogo
7. conferma

Esempio:

Angelo

Venerdì 18 settembre

17:30 - 18:00

Taglio

Conferma prenotazione

---

# 26. BOOKING STATUS

Prevedi stati robusti.

Almeno:

- pending
- confirmed
- rejected
- cancelled
- completed
- no_show

Valuta eventuali ulteriori stati se necessari.

---

# 27. PRENOTAZIONE RICORRENTE

Deve essere una funzionalità di primo livello.

Il customer deve poter scegliere:

- professionista
- servizio
- giorno della settimana
- frequenza
- intervallo
- ora
- data inizio
- data fine
- oppure numero di occorrenze

Esempi:

Ogni venerdì.

Ogni 2 venerdì.

Ogni 3 settimane.

Ogni mese.

---

# 28. RECURRENCE MODEL

Non salvare semplicemente tutte le prenotazioni future come record indipendenti senza una relazione.

Deve esistere una entità:

recurring_bookings

che rappresenta la regola.

E una entità:

recurring_booking_occurrences

che rappresenta le singole occorrenze generate.

In questo modo possiamo distinguere:

REGOLA

"Ogni venerdì alle 17:30"

da:

OCCORRENZA

"Venerdì 16 ottobre alle 17:30"

---

# 29. APPROVAZIONE RICORRENTE

IMPORTANTE:

Una prenotazione ricorrente NON deve diventare automaticamente confirmed.

Workflow:

Customer
↓
crea recurring booking request
↓
status = pending
↓
Hairdresser riceve notifica
↓
Hairdresser apre richiesta
↓
Accept / Reject
↓
se Accept:
recurring booking = active
↓
vengono create/gestite le occurrences
↓
customer riceve notifica

---

# 30. RICHIESTA RICORRENTE

Mostra al parrucchiere:

NUOVA RICHIESTA

Marco Rossi

Angelo

Ogni venerdì

17:30

Dal 25 settembre

Al 18 dicembre

[ACCETTA]

[RIFIUTA]

L'interfaccia deve rendere immediatamente comprensibile cosa sta accettando.

---

# 31. CONFLITTI RICORRENZE

Devi progettare questo caso attentamente.

Esempio:

Regola:

Ogni venerdì alle 17:30

Ma:

16 ottobre → Angelo non è disponibile.

Il sistema NON deve semplicemente rompersi.

Prevedi una gestione per singola occurrence.

Possibili stati:

- scheduled
- confirmed
- conflict
- cancelled
- skipped
- rescheduled
- completed
- no_show

Il sistema deve poter gestire eccezioni senza modificare necessariamente la regola principale.

---

# 32. CANCELLAZIONE

Deve essere possibile cancellare:

## Prenotazione singola

Cancella quell'appuntamento.

## Occorrenza ricorrente

Chiedi:

"Cosa vuoi cancellare?"

- Solo questo appuntamento
- Tutti gli appuntamenti futuri

NON cancellare automaticamente l'intera regola quando il cliente cancella una singola occurrence.

---

# 33. MODIFICA RICORRENZA

Prevedi la possibilità futura di modificare:

- giorno
- frequenza
- ora
- data fine

Se la modifica riguarda tutte le occorrenze future, deve essere distinta dalla modifica di una singola occurrence.

---

# 34. DISPONIBILITÀ

Il sistema deve distinguere tra:

## Regular availability

Esempio:

Angelo:

Lunedì
09:00 - 18:00

Martedì
09:00 - 18:00

ecc.

e:

## Exceptions

- ferie
- permessi
- malattia
- giorno chiuso
- blocco temporaneo

e:

## Blocked slots

Esempio:

Venerdì 17:30 - 18:30

bloccato manualmente.

---

# 35. CALENDARIO

Il calendario deve essere estremamente mobile-friendly.

NON utilizzare una classica tabella desktop gigantesca su smartphone.

Mobile:

- agenda verticale
- giorno selezionabile
- date carousel
- slot cards
- bottom sheets

Desktop:

può diventare:

- calendar grid
- day view
- week view

---

# 36. MOBILE BOOKING FLOW

Il flow ideale:

HOME
↓
PRENOTA
↓
SCEGLI PROFESSIONISTA
↓
SCEGLI DATA
↓
SCEGLI ORARIO
↓
CONFERMA

Riduci al minimo il numero di tap.

---

# 37. PROFESSIONISTI

Su mobile mostra card grandi e facilmente selezionabili.

Esempio:

[ FOTO ]

ANGELO

[Disponibile oggi]

---

[ FOTO ]

CIMBONE

---

[ FOTO ]

VITO

---

[ FOTO ]

FEDE

La card deve avere un touch target ampio.

---

# 38. DATE PICKER

Evita un date picker desktop classico.

Preferisci:

una data carousel orizzontale:

LUN
14

MAR
15

MER
16

GIO
17

VEN
18

SAB
19

DOM
20

con scroll orizzontale.

La data selezionata deve essere estremamente evidente.

---

# 39. TIME SLOTS

Gli orari devono essere mostrati come grandi touch targets.

Esempio:

09:00
09:30
10:00
10:30

Gli slot occupati:

- disabled
- visualmente distinti
- non cliccabili

Gli slot disponibili:

- molto evidenti

---

# 40. HOME CUSTOMER

La home deve essere consumer-oriented.

NON chiamarla necessariamente "Dashboard".

Possibile struttura:

WELCOME BACK

Marco 👋

YOUR NEXT APPOINTMENT

[Appointment Card]

Friday
18 September

17:30

Angelo

[Dettagli]

---

BOOK YOUR NEXT APPOINTMENT

[PRENOTA]

---

RECURRING APPOINTMENT

"Vuoi sempre lo stesso appuntamento?"

[CREA RICORRENZA]

---

YOUR APPOINTMENTS

---

# 41. BOTTOM NAVIGATION

Su mobile customer:

Home
Prenota
Appuntamenti
Profilo

La voce Prenota deve essere molto evidente.

Considera eventualmente una CTA centrale/floating, ma senza compromettere la semplicità.

---

# 42. HAIRDRESSER MOBILE UX

Il parrucchiere deve poter gestire tutto rapidamente da smartphone.

Home:

ANGELO

TODAY

09:00
Marco

09:30
Luca

10:00
AVAILABLE

10:30
Paolo

---

REQUESTS

2 nuove richieste

La UI deve privilegiare velocità e leggibilità.

---

# 43. ADMIN

L'admin può avere una UI più gestionale.

Su mobile deve comunque funzionare bene.

Su desktop può utilizzare:

- sidebar
- tabelle
- calendario completo
- dashboard

Ma anche l'admin NON deve avere una UI inutilmente complessa.

---

# 44. AUTHENTICATION

Implementa:

## Google

"Continua con Google"

come metodo principale.

## Email

- registrazione
- login
- reset password

## Magic Link

Valuta l'uso del magic link per ridurre la frizione.

L'obiettivo è:

# entrare nell'app nel minor numero possibile di passaggi.

---

# 45. LOGIN MOBILE

Il login deve essere elegante e brandizzato.

Possibile:

LOGO

AMERICAN
BARBER
TATTOO

"Book your next appointment."

[Continua con Google]

oppure:

[Continua con email]

---

# 46. PWA

L'app deve essere una vera PWA.

Implementa:

- manifest
- icons
- service worker
- installability
- standalone mode
- caching appropriato
- offline fallback dove sensato
- splash / app metadata
- viewport configuration

Testa particolarmente:

Android Chrome
iOS Safari

L'esperienza installata deve essere il più possibile simile a un'app.

---

# 47. PWA INSTALLATION UX

Prevedi un modo elegante per spiegare all'utente come installare l'app.

NON mostrare continuamente popup fastidiosi.

Potrebbe esistere una card:

INSTALL THE APP

"Porta American Barber Tattoo sulla Home del tuo telefono."

[INSTALLA]

Su browser dove l'installazione automatica non è disponibile, mostra istruzioni contestuali.

---

# 48. NOTIFICHE

Prevedi un sistema di notification events.

Eventi:

- booking_created
- booking_confirmed
- booking_rejected
- booking_cancelled
- recurring_request_created
- recurring_request_approved
- recurring_request_rejected
- reminder_24h
- reminder_1h
- schedule_changed

Il sistema deve essere astratto dal canale.

In futuro:

Email
Push
SMS
WhatsApp

---

# 49. REMINDERS

Prevedi reminder configurabili.

Default:

24 ore prima

1 ora prima

Il sistema deve evitare duplicazioni.

---

# 50. ERROR HANDLING

Non mostrare errori tecnici agli utenti quando può essere evitato.

NON:

"Error 500"

MA:

"Questo orario non è più disponibile. Qualcun altro potrebbe averlo appena prenotato."

e:

[SCOPRI ALTRI ORARI]

---

# 51. CONCURRENCY

Questo è fondamentale.

Scenario:

Due utenti aprono contemporaneamente:

Venerdì
17:30
Angelo

Entrambi vedono:

AVAILABLE

Entrambi cliccano:

CONFIRM

Il database deve garantire che solo uno possa ottenere lo slot.

Implementa una strategia robusta usando:

- database constraints
- transaction
- locking / atomic operations
- server-side validation

secondo la soluzione più corretta per PostgreSQL/Supabase.

---

# 52. RLS — SUPABASE

Implementa Row Level Security.

Regola fondamentale:

Un customer NON può vedere i dati privati di un altro customer.

Un customer può vedere solo ciò che gli serve.

Un hairdresser può vedere i dati necessari alla gestione del proprio lavoro.

Un hairdresser NON deve poter modificare arbitrariamente i dati di un'altra organization.

Un admin/owner può gestire la propria organization.

L'accesso deve essere verificato lato server e database.

NON affidarti solo al frontend.

---

# 53. AUTHORIZATION

Non utilizzare semplicemente:

if (user.role === "admin")

nel client come unica protezione.

Il frontend può nascondere UI.

La vera sicurezza deve essere applicata:

- server
- database
- RLS
- authorization checks

---

# 54. SECURITY

Presta attenzione a:

- session management
- OAuth
- RLS
- input validation
- SQL injection
- XSS
- CSRF dove applicabile
- rate limiting
- authorization
- secret management
- environment variables

NON inserire secrets nel repository.

---

# 55. ACCESSIBILITY

Rispetta:

- semantic HTML
- aria
- keyboard navigation
- focus states
- contrast
- screen readers
- reduced motion
- touch target >= circa 44px

L'accessibilità NON deve essere sacrificata per il design.

---

# 56. ANIMATIONS

Utilizza micro-interazioni premium.

Possibili:

- ink reveal
- subtle line drawing
- card transitions
- smooth date selection
- slot selection
- success animation
- page transitions
- bottom sheet transitions
- skeleton loading

Le animazioni devono essere:

- rapide
- fluide
- deliberate
- premium

NON usare animazioni solo per "fare scena".

La velocità di prenotazione è più importante.

Rispetta:

prefers-reduced-motion

---

# 57. SUCCESS SCREEN

Dopo una prenotazione:

CHECK / SUCCESS

"APPUNTAMENTO CONFERMATO"

Angelo

Friday
18 September

17:30

[VEDI APPUNTAMENTO]

L'animazione deve essere breve e soddisfacente.

---

# 58. EMPTY STATES

Esempio:

NESSUN APPUNTAMENTO

"Il tuo prossimo appuntamento potrebbe essere qui."

[PRENOTA ORA]

Ogni empty state deve avere:

- spiegazione
- CTA appropriata

---

# 59. LOADING STATES

Non mostrare pagine bianche.

Utilizza:

- skeleton
- loading indicators
- optimistic UI dove appropriato

---

# 60. OFFLINE / NETWORK

Gestisci in modo elegante:

- perdita connessione
- timeout
- slow network
- retry

Non permettere che una connessione instabile generi doppie prenotazioni.

---

# 61. PERFORMANCE

Ottimizza per smartphone.

Obiettivo:

- first load veloce
- bundle ridotto
- immagini ottimizzate
- lazy loading
- caching
- font ottimizzati
- evitare JavaScript inutile

Non installare librerie per ogni piccola funzionalità.

---

# 62. COMPONENT ARCHITECTURE

Organizza i componenti in modo professionale.

Possibile struttura:

src/
│
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── app/
│   ├── hairdresser/
│   ├── admin/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── booking/
│   ├── calendar/
│   ├── appointments/
│   ├── hairdressers/
│   ├── recurring/
│   ├── notifications/
│   └── layout/
│
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── bookings/
│   ├── recurring/
│   ├── availability/
│   ├── notifications/
│   └── permissions/
│
├── hooks/
│
├── types/
│
├── config/
│
└── styles/
```

Modifica questa struttura se hai una soluzione architetturale migliore.

Non creare file enormi.

---

# 63. BUSINESS LOGIC

Separa chiaramente:

UI

da:

Business logic

da:

Database access

da:

Authorization

Esempio concettuale:

UI
↓
booking service
↓
authorization
↓
database transaction
↓
PostgreSQL

Non mettere tutta la logica dentro un React component.

---

# 64. TYPESCRIPT

Utilizza TypeScript strict.

Evita:

any

quando non necessario.

Utilizza tipi forti per:

* BookingStatus
* RecurringBookingStatus
* UserRole
* Organization
* Hairdresser
* Appointment
* Availability
* Service

---

# 65. VALIDATION

Utilizza uno schema validator appropriato, ad esempio Zod.

Valida lato server:

* date
* time
* professional
* service
* recurrence
* permissions
* organization
* input utente

---

# 66. AUDIT LOG

Prevedi una struttura audit log per azioni importanti.

Esempi:

* appointment_created
* appointment_cancelled
* recurring_booking_approved
* recurring_booking_rejected
* availability_changed

Non necessariamente mostrare questi dati all'utente.

Servono per debugging e gestione futura.

---

# 67. SEED

Crea seed data.

Organization:

American Barber Tattoo

Professionisti:

Angelo
Cimbone
Vito
Fede

Crea inoltre dati demo per testare:

* customer
* hairdresser
* admin

NON mettere password reali nel repository.

---

# 68. FUTURE FEATURES

L'architettura deve poter supportare in futuro:

* servizi
* durate diverse
* prezzi
* pagamenti
* deposito
* lista d'attesa
* recensioni
* coupon
* loyalty
* più sedi
* statistiche
* Google Calendar
* Apple Calendar
* WhatsApp
* SMS
* email automation
* push notifications
* abbonamenti SaaS
* Stripe
* custom domains
* white label

NON implementare queste feature nell'MVP se non sono necessarie.

Prepara però l'architettura.

---

# 69. FUTURO MODELLO COMMERCIALE

Non implementare ora billing.

Ma considera che in futuro potrebbe esistere:

FREE
PRO
BUSINESS

con funzionalità differenti.

Non inserire codice relativo a billing se non necessario.

Evita però architetture che rendano impossibile aggiungerlo successivamente.

---

# 70. MOBILE NAVIGATION

Customer:

HOME
PRENOTA
APPUNTAMENTI
PROFILO

Hairdresser:

AGENDA
RICHIESTE
DISPONIBILITÀ
PROFILO

Admin:

DASHBOARD
CALENDARIO
STAFF
SETTINGS

Su desktop queste strutture possono trasformarsi in sidebar.

---

# 71. MOBILE UI RULES

Ogni pagina mobile deve rispettare:

* touch target grandi
* testo leggibile
* spacing generoso
* niente horizontal scrolling accidentale
* CTA raggiungibili con una mano
* sticky CTA quando utile
* bottom sheets dove appropriato
* modali che non risultino scomodi con tastiera virtuale
* safe area support per iPhone

Considera:

env(safe-area-inset-bottom)

quando appropriato.

---

# 72. FORM UX

I form devono essere corti.

Non chiedere dati non necessari.

Autofill dove possibile.

Utilizza input types corretti:

email
tel
date
time

quando appropriato.

Gestisci correttamente la tastiera mobile.

---

# 73. DESKTOP

Desktop è secondario rispetto a mobile.

NON sacrificare la mobile UX per ottenere una dashboard desktop più bella.

Desktop può offrire:

* sidebar
* calendar grid
* multi-column layout
* statistics
* larger management screens

Ma la logica e il design system devono rimanere coerenti.

---

# 74. RESPONSIVE BREAKPOINTS

Non progettare solo per:

375px
768px
1440px

Testa mentalmente e tecnicamente anche viewport intermedi.

Particolare attenzione a:

* 320px
* 360px
* 375px
* 390px
* 414px
* tablet
* desktop

---

# 75. DESIGN TOKENS

Crea token centralizzati per:

* colors
* typography
* spacing
* radius
* shadows
* transitions

Il branding della organization deve poter modificare i token principali dove appropriato.

---

# 76. THEME SYSTEM

Prevedi un sistema di tema.

Concettualmente:

Organization
↓
Brand config
↓
Theme
↓
UI

In questo modo American Barber Tattoo può avere il proprio look.

In futuro un altro tenant potrà avere un look completamente differente.

---

# 77. NON CREARE UN GENERIC TEMPLATE

Questo è importante.

Non voglio che il risultato sembri:

"Booking SaaS Template #42"

Il prodotto deve essere immediatamente riconoscibile come:

# AMERICAN BARBER TATTOO

La genericità deve stare nell'ARCHITETTURA.

La personalità deve stare nella UI.

---

# 78. USER EXPERIENCE PRINCIPALE

Il customer ideale apre l'app.

Vede:

"Quando vuoi venire?"

Tocca:

PRENOTA

Sceglie:

ANGELO

Sceglie:

VENERDÌ

Sceglie:

17:30

Tocca:

CONFERMA

Fine.

Obiettivo:

# booking in pochi secondi.

---

# 79. RECURRING EXPERIENCE

Il customer apre:

PRENOTAZIONE RICORRENTE

Vede:

CON CHI?

Angelo

QUANDO?

Venerdì

OGNI QUANTO?

Ogni settimana

A CHE ORA?

17:30

DA:

25 settembre

A:

18 dicembre

Poi:

RIEPILOGO

Ogni venerdì alle 17:30
con Angelo

[INVIA RICHIESTA]

Nota:

"Questa richiesta dovrà essere approvata da Angelo."

---

# 80. HAIRDRESSER REQUEST EXPERIENCE

Angelo apre:

RICHIESTE

1 nuova richiesta

Marco Rossi

Ogni venerdì
17:30

25 settembre → 18 dicembre

[ACCETTA]

[RIFIUTA]

Se accetta:

REQUEST APPROVED

Il customer riceve una notifica.

---

# 81. BOOKING EDGE CASES

Testa almeno:

1. Due utenti prenotano lo stesso slot contemporaneamente.

2. Un utente apre uno slot libero e qualcun altro lo prenota prima della conferma.

3. Una ricorrenza contiene una data in cui il parrucchiere non lavora.

4. Una ricorrenza contiene un giorno festivo.

5. Un parrucchiere viene messo in ferie dopo l'approvazione della ricorrenza.

6. Una singola occurrence viene cancellata.

7. Tutte le future occurrences vengono cancellate.

8. Un appuntamento viene spostato.

9. Un parrucchiere viene disattivato.

10. Un customer viene eliminato.

11. Un utente non autenticato tenta di accedere a una pagina privata.

12. Un customer tenta di accedere a una pagina hairdresser.

13. Un hairdresser tenta di accedere a dati di un'altra organization.

14. Una sessione scade durante una prenotazione.

15. La rete cade durante la conferma.

16. L'orario legale cambia.

17. La durata del servizio è diversa da 30 minuti.

---

# 82. TESTING

Implementa test per la logica critica.

Almeno:

* booking creation
* booking cancellation
* booking conflicts
* availability
* recurring rules
* recurring occurrences
* approval
* cancellation of occurrence
* cancellation of future recurrence
* authorization
* RLS-sensitive operations

---

# 83. README

Crea un README professionale con:

* project overview
* architecture
* setup
* environment variables
* Supabase setup
* database migrations
* seed
* local development
* PWA development
* testing
* deployment

---

# 84. ENVIRONMENT VARIABLES

Utilizza `.env.local`.

NON committare secrets.

Fornisci:

`.env.example`

con i nomi delle variabili necessarie.

---

# 85. DATABASE MIGRATIONS

Non modificare manualmente il database senza una migration tracciabile.

Utilizza migration versionate.

Ogni modifica allo schema deve poter essere riprodotta.

---

# 86. SUPABASE

Organizza:

* migrations
* seed
* policies
* functions se necessarie
* database types

Se possibile genera/utilizza tipi TypeScript derivati dallo schema.

---

# 87. SERVER ACTIONS / API

Utilizza il paradigma più appropriato di Next.js.

Le operazioni critiche devono essere server-side.

In particolare:

* create booking
* cancel booking
* approve recurring booking
* reject recurring booking
* create availability
* modify availability

NON affidarti a chiamate client-side prive di autorizzazione server-side.

---

# 88. SEO

Anche se l'app è principalmente autenticata, prevedi una landing page pubblica per American Barber Tattoo.

Possibile:

/

con:

* logo
* brand
* breve descrizione
* CTA
* login
* prenota

La landing deve essere coerente con il brand.

---

# 89. PUBLIC BOOKING

Valuta architetturalmente la possibilità futura di permettere:

"Prenota con American Barber Tattoo"

senza che il cliente debba navigare dentro la dashboard.

Questo potrebbe diventare in futuro:

/book

o:

/americanbarbertattoo/book

Ma NON sacrificare la sicurezza dell'area autenticata.

---

# 90. ADMIN EXPERIENCE

L'admin deve poter gestire:

* organization
* branding
* staff
* customers
* appointments
* availability
* settings

Per ora non serve un CMS gigantesco.

---

# 91. BRAND SETTINGS

Prevedi impostazioni:

* nome salone
* logo
* colori
* timezone
* booking interval
* cancellation policy
* notification preferences
* opening hours

---

# 92. CANCELLATION POLICY

Non hardcodare una policy specifica se non è stata definita.

Prevedi un'impostazione configurabile.

Esempio futuro:

"È possibile cancellare fino a 2 ore prima."

Per l'MVP puoi usare una policy semplice.

---

# 93. BUSINESS SETTINGS

Prevedi:

booking_interval_minutes

default:

30

NON utilizzare:

const SLOT_DURATION = 30

sparso in tutto il codice.

La configurazione deve poter evolvere.

---

# 94. OBSERVABILITY

Prevedi una struttura minima per:

* error logging
* server errors
* booking failures
* auth errors

Non serve costruire ora una piattaforma di observability complessa.

---

# 95. PRODUCT QUALITY BAR

Non fermarti quando:

"la funzione funziona".

Una feature è completa quando:

* funziona
* è mobile-friendly
* è accessibile
* gestisce loading
* gestisce error
* gestisce empty state
* è responsive
* ha micro-interazioni appropriate
* è sicura
* è testata

---

# 96. ORDINE DI IMPLEMENTAZIONE

Procedi in questa sequenza:

## PHASE 1

Project setup

## PHASE 2

Supabase

## PHASE 3

Database schema

## PHASE 4

RLS

## PHASE 5

Authentication

## PHASE 6

Organization / tenant

## PHASE 7

Hairdressers

## PHASE 8

Availability

## PHASE 9

Booking engine

## PHASE 10

Recurring booking engine

## PHASE 11

Customer UX

## PHASE 12

Hairdresser UX

## PHASE 13

Admin

## PHASE 14

Notifications

## PHASE 15

PWA

## PHASE 16

Design polish

## PHASE 17

Testing

## PHASE 18

Performance

## PHASE 19

Final QA

---

# 97. APPROCCIO DI LAVORO

Dopo ogni fase:

1. verifica il lavoro
2. cerca errori
3. controlla eventuali regressioni
4. correggi
5. solo dopo procedi

NON accumulare problemi tecnici fino alla fine.

---

# 98. QUANDO DEVI PRENDERE DECISIONI

Non fermarti per ogni piccola ambiguità.

Usa il tuo giudizio professionale.

Quando ci sono più possibilità:

1. analizza le alternative
2. scegli quella migliore
3. spiegami brevemente il motivo
4. implementala

Chiedimi chiarimenti solo quando la scelta cambia radicalmente:

* architettura
* sicurezza
* database
* business logic
* UX fondamentale

---

# 99. NON INVENTARE FUNZIONALITÀ BUSINESS

Se una regola non è stata definita:

NON inventare una regola commerciale definitiva.

Esempio:

Non decidere autonomamente:

"il cliente può cancellare fino a 2 ore prima"

senza configurarla.

In questi casi:

* crea una configurazione
* usa un default ragionevole
* documenta la decisione

---

# 100. FIRST DELIVERABLE

PRIMA DI IMPLEMENTARE IL CODICE voglio che tu produca un documento tecnico iniziale contenente:

## A. PRODUCT ANALYSIS

Come hai interpretato il prodotto.

## B. ARCHITECTURE

Diagramma concettuale.

## C. DATABASE

Tabelle, campi, relazioni.

## D. RLS

Strategia di sicurezza.

## E. BOOKING ENGINE

Come impedisci double booking.

## F. RECURRING ENGINE

Come gestisci regole, occurrences e conflitti.

## G. USER FLOWS

Customer
Hairdresser
Admin

## H. ROUTING

Struttura delle route Next.js.

## I. COMPONENT ARCHITECTURE

Struttura dei componenti.

## J. DESIGN SYSTEM

Colori
Typography
Spacing
Radius
Shadows
Buttons
Cards
Inputs
Calendar
Bottom sheets

## K. MOBILE UX

Descrivi esplicitamente come ogni schermata sarà progettata mobile-first.

## L. PWA

Strategia di installazione e caching.

## M. SECURITY

Auth + authorization + RLS.

## N. ROADMAP

Milestone di implementazione.

---

# 101. REGOLA FINALE

Prima di ogni decisione chiediti:

> "Questa soluzione rende l'esperienza migliore su smartphone?"

Se la risposta è no, ripensa la soluzione.

E chiediti:

> "Questa soluzione ci impedisce di trasformare il prodotto in una piattaforma multi-tenant in futuro?"

Se sì, riprogetta l'architettura.

E infine:

> "Questa interfaccia sembra davvero American Barber Tattoo?"

Se la risposta è no, migliora il design.

---

# OBIETTIVO FINALE

Voglio arrivare a questo:

Un utente apre American Barber Tattoo dal telefono.

Vede il brand.

Effettua il login con Google.

Tocca:

PRENOTA

Sceglie:

ANGELO

Sceglie:

VENERDÌ

Sceglie:

17:30

Tocca:

CONFERMA

E in pochi secondi ha prenotato.

Se vuole un appuntamento ricorrente:

PRENOTAZIONE RICORRENTE

Ogni venerdì
17:30
Angelo

INVIA RICHIESTA

Angelo riceve la richiesta.

La approva.

Il cliente riceve la conferma.

Tutto deve risultare:

# SEMPLICE

# VELOCE

# PREMIUM

# MOBILE-FIRST

# AMERICAN BARBER TATTOO

Non deve sembrare un gestionale.

Deve sembrare un prodotto digitale vero.

---

# INIZIA ORA

NON iniziare ancora scrivendo tutto il codice.

Produci prima il deliverable tecnico della sezione 100.

Dopo averlo prodotto, procedi con l'implementazione fase per fase.

Durante tutto il progetto mantieni come vincoli fondamentali:

1. MOBILE FIRST
2. UX SEMPLICE
3. AMERICAN BARBER TATTOO BRAND
4. BOOKING ENGINE AFFIDABILE
5. RICORRENZE
6. SICUREZZA
7. MULTI-TENANT ARCHITECTURE
8. PWA
9. PERFORMANCE
10. SCALABILITÀ

```

## Una precisazione importante che ho inserito volutamente

Ho **separato `services` da `appointments`** anche se all'inizio potresti pensare:

> "Per ora sono tutti slot da 30 minuti, non servono i servizi."

Invece secondo me è una delle decisioni architetturali più importanti. Oggi puoi avere:

**Taglio → 30 min**

Domani:

**Taglio → 30 min**  
**Barba → 30 min**  
**Taglio + Barba → 60 min**  
**Tattoo → 90 min**

e il motore di prenotazione non deve essere riscritto.

---

### E soprattutto: ho reso il concetto SaaS "invisibile"

Questa secondo me è la soluzione migliore per il tuo progetto.

**Oggi:**

> American Barber Tattoo  
> → 4 professionisti  
> → una PWA  
> → nessun concetto percepibile di SaaS

**Domani:**

> La stessa piattaforma  
> → 100 barber shop  
> → ognuno col proprio logo  
> → propri colori  
> → propri professionisti  
> → propri servizi  
> → proprio calendario  
> → proprio dominio  
> → abbonamento mensile

Il cliente di American Barber Tattoo non deve accorgersi che sotto esiste questa infrastruttura.

E c'è un'altra cosa che farei **fin da subito**: quando Sonnet arriva al design, gli farei trattare il **logo come asset principale del brand e non tentare di ricrearlo con un font**. Il logo che mi hai mostrato ha una tipografia molto particolare: va usato come immagine/SVG originale, mentre la UI deve usare un font leggibile. È proprio questo contrasto che può far sembrare l'app molto più professionale.
```
