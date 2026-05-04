import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Playwright y herramientas que abren `127.0.0.1` necesitan esto en dev (Next 16+). */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  /** Binarios nativos (sharp) y pdfkit no deben empaquetarse en el grafo del cliente. */
  serverExternalPackages: ["sharp", "pdfkit"],
};

export default nextConfig;
