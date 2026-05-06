import Link from "next/link";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-6",
        highlighted
          ? "border-zinc-900 bg-white shadow-sm dark:border-zinc-100 dark:bg-zinc-950"
          : "border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/40",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {name}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {price}
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </div>
        </div>
        {highlighted ? (
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            Popular
          </span>
        ) : null}
      </div>

      <ul className="mt-6 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-zinc-300 dark:border-zinc-700" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={[
          "mt-6 w-full rounded-md px-4 py-2 text-sm font-medium",
          highlighted
            ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            : "border border-zinc-300 text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900",
        ].join(" ")}
      >
        Suscribirse
      </button>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-full">
      <Header />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-100 via-zinc-50 to-transparent dark:from-zinc-900/30 dark:via-zinc-950 dark:to-transparent" />
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-6xl">
                Crea diseños profesionales en segundos con IA
              </h1>
              <p className="mt-5 text-base text-zinc-600 dark:text-zinc-400 md:text-lg">
                Editor visual + generación inteligente de imágenes, texto y
                layouts en un solo lugar.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="w-full rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white sm:w-auto"
                >
                  Empezar gratis
                </Link>
                <a
                  href="#demo"
                  className="w-full rounded-md border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900 sm:w-auto"
                >
                  Ver demo
                </a>
              </div>

              <p className="mt-6 text-xs text-zinc-500">
                Sin tarjeta. Exportá cuando quieras. Escalá con Stripe después.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Todo lo que necesitás para diseñar rápido
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Una experiencia tipo Canva con automatizaciones y export pro.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              title="Editor visual tipo Canva"
              description="Arrastrá, alineá, agrupá y editá objetos con precisión."
            />
            <FeatureCard
              title="Generación de imágenes con IA"
              description="Inpaint y mejoras inteligentes para acelerar tu flujo."
            />
            <FeatureCard
              title="Export profesional"
              description="PDF / print listo para producción y flujos de trabajo."
            />
            <FeatureCard
              title="Autosave + nube"
              description="Guardado automático, historial y proyectos sincronizados."
            />
          </div>
        </section>

        {/* PREVIEW */}
        <section id="demo" className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Diseñá como un profesional sin ser diseñador
              </h2>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Un editor pensado para velocidad: atajos, selección fina, y
                asistencia inteligente donde suma.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/editor/demo"
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  Abrir demo del editor
                </Link>
                <Link
                  href="/login"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  Crear proyecto en la nube
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 text-xs text-zinc-500 dark:border-zinc-800">
                <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className="ml-2">Editor preview</span>
              </div>
              <div className="mt-4 aspect-[16/10] rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900/40 dark:to-zinc-950">
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  Mockup del editor (placeholder)
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Planes simples
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Elegí el plan según tu volumen. Conexión con Stripe lista para
              integrar.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <PricingCard
              name="Free"
              price="$0"
              description="Para probar el flujo."
              features={[
                "Uso básico del editor",
                "IA limitada",
                "Exports limitados",
              ]}
            />
            <PricingCard
              name="Pro"
              price="$10/mes"
              description="Para creadores y equipos pequeños."
              features={[
                "Más IA y exports",
                "Prioridad en jobs",
                "Dashboards de uso",
              ]}
              highlighted
            />
            <PricingCard
              name="Business"
              price="Hablemos"
              description="Para alto volumen y soporte."
              features={[
                "Uso alto",
                "Límites custom",
                "Soporte y SLA",
              ]}
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-2xl border border-zinc-200 bg-white/70 p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Empieza a crear ahora
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Abrí el editor, probá el demo y convertí tu flujo a producción.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="w-full rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white sm:w-auto"
              >
                Crear mi primer diseño
              </Link>
              <Link
                href="/editor/demo"
                className="w-full rounded-md border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900 sm:w-auto"
              >
                Probar demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/70 p-6 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="mb-4 h-10 w-10 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {title}
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}
