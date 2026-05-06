"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      {/* Gradient Background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-600/30 via-blue-500/20 to-transparent blur-3xl" />

      {/* HEADER */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="text-lg font-semibold">Editor Maestro</div>
        <div className="flex gap-4 text-sm">
          <Link href="/login" className="opacity-80 hover:opacity-100">
            Login
          </Link>
          <a href="#pricing" className="opacity-80 hover:opacity-100">
            Pricing
          </a>
          <Link
            href="/login"
            className="rounded-lg bg-white px-4 py-2 font-medium text-black transition hover:bg-gray-200"
          >
            Empezar
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold leading-tight md:text-7xl"
        >
          Diseña como un pro
          <span className="block bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            con inteligencia artificial
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 max-w-xl text-lg text-gray-300"
        >
          Editor visual + generación inteligente en un solo lugar.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex gap-4"
        >
          <Link
            href="/login"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200"
          >
            Empezar gratis
          </Link>
          <a
            href="#demo"
            className="rounded-xl border border-white/20 px-6 py-3 transition hover:bg-white/10"
          >
            Ver demo
          </a>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-3">
        {["Editor visual", "IA integrada", "Export profesional"].map(
          (title, i) => (
            <motion.div
              key={title}
              whileHover={{ scale: 1.05 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <div className="mb-2 text-xl font-semibold">{title}</div>
              <p className="text-sm text-gray-400">
                Diseñá rápido con un flujo potente y moderno.
              </p>
            </motion.div>
          ),
        )}
      </section>

      {/* PREVIEW */}
      <section id="demo" className="relative z-10 px-6 py-24 text-center">
        <h2 className="mb-6 text-3xl font-bold">Mirá el editor en acción</h2>
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10">
          <div className="flex h-64 items-center justify-center bg-gradient-to-br from-purple-500/30 to-blue-500/30">
            Preview del editor
          </div>
        </div>
        <div className="mt-6">
          <Link
            href="/editor/demo"
            className="inline-flex rounded-xl border border-white/20 px-6 py-3 text-sm transition hover:bg-white/10"
          >
            Abrir demo real
          </Link>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold">Planes</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {["Free", "Pro", "Business"].map((plan) => (
            <div
              key={plan}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <h3 className="mb-4 text-xl font-semibold">{plan}</h3>
              <p className="mb-6 text-gray-400">Ideal para comenzar</p>
              <button className="w-full rounded-lg bg-white py-2 font-medium text-black hover:bg-gray-200">
                Elegir
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative z-10 px-6 py-24 text-center">
        <h2 className="mb-6 text-4xl font-bold">Empieza ahora</h2>
        <Link
          href="/login"
          className="inline-flex rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-8 py-4 font-semibold"
        >
          Crear mi primer diseño
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-6 py-10 text-center text-sm text-gray-500">
        © 2026 Editor Maestro
      </footer>
    </div>
  );
}
