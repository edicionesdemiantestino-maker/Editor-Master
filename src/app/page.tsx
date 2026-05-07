"use client";

import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

type PlanCard = {
  name: string;
  price: string;
  href: string;
  highlight?: boolean;
};

const PLANS: PlanCard[] = [
  { name: "Free", price: "$0", href: "/register" },
  { name: "Pro", price: "$12", href: "/pricing", highlight: true },
  { name: "Business", price: "$49", href: "/pricing" },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* BACKGROUND */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(120,119,198,0.3),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,0,128,0.2),transparent_40%)]" />
        <div className="absolute inset-0 backdrop-blur-3xl" />
      </div>

      {/* NAV */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="text-xl font-bold">Editor Maestro</div>
        <div className="flex gap-4">
          <Button variant="ghost" href="/login">
            Login
          </Button>
          <Button href="/register">Get Started</Button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 py-32 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-6xl font-bold leading-tight tracking-tight md:text-8xl"
        >
          Diseña el futuro
          <span className="block bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            sin límites
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 max-w-xl text-lg text-zinc-400"
        >
          Un editor visual de nueva generación con performance extrema y diseño de nivel profesional.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <Button size="lg" href="/register">
            Empezar gratis
          </Button>
          <Button size="lg" variant="outline" href="/editor/demo">
            Ver demo
          </Button>
        </motion.div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="relative z-10 px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 + i, ease: "easeInOut" }}
                className="h-32 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20"
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* PRICING */}
      <section className="relative z-10 px-8 py-24">
        <h2 className="mb-12 text-center text-4xl font-bold">Planes</h2>
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 ${
                plan.highlight
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold">{plan.price}</p>
              <Button className="mt-6 w-full" href={plan.href}>
                Elegir
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 text-center">
        <h2 className="text-4xl font-bold">Empieza ahora</h2>
        <div className="mt-6 flex justify-center">
          <Button size="lg" href="/register">
            Crear cuenta
          </Button>
        </div>
      </section>
    </div>
  );
}
