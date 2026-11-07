/**
 * ═══════════════════════════════════════════════════════════════════
 * DÉMARRAGE DE L'API (Render)
 * ═══════════════════════════════════════════════════════════════════
 * - rawBody : conserve le corps brut, indispensable pour vérifier la signature
 *   des webhooks Jeko et KYC.
 * - helmet : en-têtes de sécurité HTTP.
 * - CORS : seuls les 3 domaines de la plateforme peuvent appeler l'API depuis
 *   un navigateur (ALLOWED_ORIGINS). Les webhooks ne passent pas par CORS.
 * - Arrêt propre : Render peut redémarrer l'instance à tout moment.
 * ═══════════════════════════════════════════════════════════════════
 */
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { env } from './noyau/config/env';
import { AppModule } from './app.module';

async function demarrer() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  app.use(helmet());
  app.enableCors({
    origin: env.ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['authorization', 'content-type', 'x-request-id'],
    credentials: false, // jeton dans l'en-tête Authorization, jamais de cookie vers l'API
    maxAge: 600,
  });
  app.useBodyParser('json', { limit: '1mb' });
  app.enableShutdownHooks();

  await app.listen(env.PORT, '0.0.0.0');
}

void demarrer();
