"use client";

import { useState } from "react";
import Link from "next/link";

type Site = { id: string; name: string; subdomain: string };
type Collection = { id: string; name: string; slug: string; site_id: string };
type Entry = { id: string; data: Record<string, unknown>; created_at: string };

type Props = {
  sites: Site[];
  initialCollections: Collection[];
  userId: string;
};

export function CmsClient({ sites, initialCollections, userId }: Props) {
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [selectedSite, setSelectedSite] = useState<Site | null>(sites[0] ?? null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newEntryData, setNewEntryData] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const siteCollections = collections.filter(
    (c) => c.site_id === selectedSite?.id,
  );

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || !selectedSite) return;
    setBusy(true);
    setError(null);
    try {
      const slug = newCollectionName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const res = await fetch(`/api/cms/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: selectedSite.id,
          data: { _init: true },
          published: false,
        }),
      });

      if (res.ok) {
        const newCol: Collection = {
          id: crypto.randomUUID(),
          name: newCollectionName.trim(),
          slug,
          site_id: selectedSite.id,
        };
        setCollections((prev) => [...prev, newCol]);
        setNewCollectionName("");
        showSuccess(`Colección "${newCollectionName}" creada.`);
      } else {
        setError("No se pudo crear la colección.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  };

  const handleLoadEntries = async (collection: Collection) => {
    setSelectedCollection(collection);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/cms/${collection.slug}?site_id=${collection.site_id}`,
      );
      const data = (await res.json()) as { entries?: Entry[] };
      setEntries((data.entries ?? []).filter((e) => e.data._init !== true));
    } catch {
      setEntries([]);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateEntry = async () => {
    if (!selectedCollection || !newEntryData.trim()) return;
    setBusy(true);
    setError(null);
    try {
      let parsed: Record<string, string>;
      try {
        parsed = JSON.parse(newEntryData) as Record<string, string>;
      } catch {
        setError("El contenido debe ser JSON válido. Ej: {\"title\": \"Mi post\"}");
        setBusy(false);
        return;
      }

      const res = await fetch(`/api/cms/${selectedCollection.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: selectedCollection.site_id,
          data: parsed,
          published: true,
        }),
      });

      if (res.ok) {
        const result = (await res.json()) as { entry?: Entry };
        if (result.entry) {
          setEntries((prev) => [result.entry!, ...prev]);
        }
        setNewEntryData("");
        showSuccess("Entrada creada correctamente.");
      } else {
        setError("No se pudo crear la entrada.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  };

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-zinc-900 p-8 text-center">
        <div className="mb-4 text-5xl">🌐</div>
        <h2 className="mb-2 text-xl font-bold text-white">
          No tenés sitios publicados
        </h2>
        <p className="mb-4 text-sm text-zinc-400">
          Primero publicá un sitio desde el editor para poder gestionar su contenido.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Ir al editor
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Sidebar */}
      <div className="flex flex-col gap-4">
        {/* Sites */}
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Sitios
          </h2>
          <div className="flex flex-col gap-1.5">
            {sites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => {
                  setSelectedSite(site);
                  setSelectedCollection(null);
                  setEntries([]);
                }}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectedSite?.id === site.id
                    ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                    : "border-white/8 bg-zinc-800 text-zinc-300 hover:border-white/20"
                }`}
              >
                <span className="font-medium">{site.name}</span>
                <span className="text-[10px] text-zinc-500">
                  {site.subdomain}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Collections */}
        {selectedSite && (
          <div className="rounded-2xl border border-white/8 bg-zinc-900 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Colecciones
            </h2>
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="nombre-coleccion"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateCollection();
                }}
                className="flex-1 rounded-xl border border-white/8 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none"
              />
              <button
                type="button"
                disabled={busy || !newCollectionName.trim()}
                onClick={() => void handleCreateCollection()}
                className="rounded-xl bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40"
              >
                +
              </button>
            </div>
            {siteCollections.length === 0 ? (
              <p className="text-xs text-zinc-600">
                Sin colecciones todavía.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {siteCollections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void handleLoadEntries(c)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                      selectedCollection?.id === c.id
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : "border-white/8 bg-zinc-800 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-1 text-zinc-600">/{c.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="lg:col-span-2">
        {!selectedCollection ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-white/8 bg-zinc-900">
            <p className="text-sm text-zinc-500">
              Seleccioná una colección para ver sus entradas.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Feedback */}
            {success && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
                ✓ {success}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* New entry */}
            <div className="rounded-2xl border border-white/8 bg-zinc-900 p-5">
              <h2 className="mb-3 text-sm font-semibold text-white">
                Nueva entrada en{" "}
                <span className="text-emerald-400">
                  /{selectedCollection.slug}
                </span>
              </h2>
              <textarea
                rows={4}
                placeholder={'{"title": "Mi entrada", "body": "Contenido..."}'}
                value={newEntryData}
                onChange={(e) => setNewEntryData(e.target.value)}
                className="w-full resize-none rounded-xl border border-white/8 bg-zinc-800 px-3 py-2.5 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none"
              />
              <button
                type="button"
                disabled={busy || !newEntryData.trim()}
                onClick={() => void handleCreateEntry()}
                className="mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40"
              >
                {busy ? "Guardando…" : "+ Crear entrada"}
              </button>
            </div>

            {/* Entries list */}
            <div className="rounded-2xl border border-white/8 bg-zinc-900 p-5">
              <h2 className="mb-3 text-sm font-semibold text-white">
                Entradas ({entries.length})
              </h2>
              {entries.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Sin entradas todavía. Creá la primera arriba.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-white/5 bg-zinc-800/50 px-4 py-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-zinc-600">
                          {entry.id.slice(0, 8)}…
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {new Date(entry.created_at).toLocaleDateString("es")}
                        </span>
                      </div>
                      <pre className="overflow-x-auto text-xs text-zinc-300">
                        {JSON.stringify(entry.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}