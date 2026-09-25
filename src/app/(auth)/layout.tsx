import Image from "next/image";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen text-paper-50 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center">
        <Image
          src="/brand/logo.png"
          alt="American Barber Tattoo"
          width={192}
          height={134}
          priority
          fetchPriority="high"
          sizes="192px"
          className="w-48 h-auto mb-3"
        />
        <p className="text-paper-50/70 text-sm mb-8">
          Prenota il tuo prossimo appuntamento.
        </p>
        {children}
      </div>
    </div>
  );
}
