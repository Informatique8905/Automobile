/**
 * Configuration Next.js — application « administrateur » (admin.votre-domaine.ci)
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
  // En-têtes communs ; la CSP stricte avec nonce est posée dans src/proxy.ts
  async headers() {
    return [{ source: '/(.*)', headers: entetesSecurite('administrateur', options) }];
  },
};

export default config;
