/**
 * Configuration Next.js — application « vendeur » (pro.votre-domaine.ci)
 */
import type { NextConfig } from 'next';
import { entetesSecurite } from '@plateforme/securite-applicative';

const options = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
};

const config: NextConfig = {
  // Paquets du monorepo fournis en TypeScript source
  transpilePackages: ['@plateforme/ui', '@plateforme/supabase', '@plateforme/types', '@plateforme/validation', '@plateforme/i18n'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Images déjà préparées en 3 tailles par l'API (WebP/AVIF) : pas d'optimisation à la volée
    unoptimized: true,
  },
  // En-têtes de sécurité communs (3-SECURITE/04-securite-applicative/src/entetes.ts)
  async headers() {
    return [{ source: '/(.*)', headers: entetesSecurite('vendeur', options) }];
  },
};

export default config;
