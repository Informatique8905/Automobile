/**
 * ═══════════════════════════════════════════════════════════════════
 * FILTRE D'ERREURS — ce que l'API répond quand quelque chose échoue
 * ═══════════════════════════════════════════════════════════════════
 * - Les codes métier de la base (BOOKING_NOT_PAYABLE, FORBIDDEN…) sont renvoyés
 *   tels quels : le frontend les traduit (1-FRONTEND/commun/i18n/src/erreurs.fr.ts).
 * - Toute autre erreur devient « INTERNAL_ERROR » : jamais de trace technique,
 *   de requête SQL ou de message d'un prestataire envoyé au navigateur.
 * - L'identifiant de requête permet de retrouver l'erreur dans les journaux.
 * ═══════════════════════════════════════════════════════════════════
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

const CODE_METIER = /^[A-Z][A-Z0-9_]{2,60}$/;
const STATUT_PAR_CODE: Record<string, number> = {
  AUTH_REQUIRED: 401, INVALID_TOKEN: 401, FORBIDDEN: 403, MFA_REQUIRED: 403, ACCOUNT_SUSPENDED: 403,
  BOOKING_NOT_FOUND: 404, LISTING_NOT_FOUND: 404, PAYMENT_NOT_FOUND: 404,
  PAYMENT_PROVIDER_UNAVAILABLE: 503,
};

@Catch()
export class FiltreErreurs implements ExceptionFilter {
  private readonly journal = new Logger('Erreurs');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const idRequete = String(req.headers['x-request-id'] ?? randomUUID());

    let statut = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      statut = exception.getStatus();
      const r = exception.getResponse();
      const message = typeof r === 'string' ? r : (r as { message?: string | string[] }).message;
      const texte = Array.isArray(message) ? message[0] : message;
      if (texte && CODE_METIER.test(texte)) {
        code = texte;
        statut = STATUT_PAR_CODE[code] ?? statut;
      } else if (statut === 429) {
        code = 'TOO_MANY_REQUESTS';
      } else if (statut < 500) {
        code = 'INVALID_REQUEST';
      }
    }

    if (statut >= 500) {
      this.journal.error(`[${idRequete}] ${req.method} ${req.url} : ${exception instanceof Error ? exception.message : exception}`);
    }
    res.status(statut).json({ code, idRequete });
  }
}
