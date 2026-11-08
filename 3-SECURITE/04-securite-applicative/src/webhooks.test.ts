// Tests : node --test --experimental-strip-types src/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifierSignatureHmac, secretsEgaux } from './webhooks.ts';
import { detecterTypeReel, controlerFichier } from './fichiers.ts';
import { construireCsp, entetesSecurite } from './entetes.ts';

const secret = 'secret-de-test';
const corps = '{"reference":"PAY-123","amount":50000,"status":"success"}';
const signe = createHmac('sha256', secret).update(corps).digest('hex');

test('signature valide acceptée', () => {
  assert.deepEqual(verifierSignatureHmac({ corpsBrut: corps, signatureRecue: signe, secret }), { valide: true });
});

test('corps modifié refusé (montant changé)', () => {
  const r = verifierSignatureHmac({ corpsBrut: corps.replace('50000', '500'), signatureRecue: signe, secret });
  assert.equal(r.valide, false);
});

test('signature absente refusée', () => {
  assert.deepEqual(verifierSignatureHmac({ corpsBrut: corps, signatureRecue: undefined, secret }),
    { valide: false, raison: 'SIGNATURE_ABSENTE' });
});

test('horodatage trop ancien refusé (rejeu)', () => {
  const vieux = Math.floor(Date.now() / 1000) - 3600;
  const r = verifierSignatureHmac({ corpsBrut: corps, signatureRecue: signe, secret, horodatage: vieux });
  assert.deepEqual(r, { valide: false, raison: 'HORODATAGE_EXPIRE' });
});

test('signature horodatée', () => {
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', secret).update(`${t}.${corps}`).digest('hex');
  const r = verifierSignatureHmac({ corpsBrut: corps, signatureRecue: `sha256=${sig}`, secret, horodatage: t,
    signerAvecHorodatage: true, prefixe: 'sha256=' });
  assert.deepEqual(r, { valide: true });
});

test('comparaison de secrets en temps constant', () => {
  assert.equal(secretsEgaux('abc', 'abc'), true);
  assert.equal(secretsEgaux('abc', 'abd'), false);
  assert.equal(secretsEgaux('abc', undefined), false);
});

test('type réel des fichiers', () => {
  assert.equal(detecterTypeReel(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
  assert.equal(detecterTypeReel(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])), 'pdf');
  const script = new TextEncoder().encode('<script>alert(1)</script>');
  assert.deepEqual(controlerFichier('photo_vehicule', script), { accepte: false, raison: 'TYPE_NON_AUTORISE' });
});

test('CSP stricte du back-office : nonce, aucune source tierce', () => {
  const csp = construireCsp('administrateur', { supabaseUrl: 'https://x.supabase.co', apiUrl: 'https://api.x.ci', nonce: 'abc' });
  assert.match(csp, /script-src 'self' 'nonce-abc' 'strict-dynamic'/);
  assert.doesNotMatch(csp, /unsafe-inline'[^;]*script/);
  assert.match(csp, /frame-ancestors 'none'/);
});

test('seul le site client est indexable', () => {
  const o = { supabaseUrl: 'https://x.supabase.co', apiUrl: 'https://api.x.ci' };
  assert.ok(!entetesSecurite('client', o).some((e) => e.key === 'X-Robots-Tag'));
  assert.ok(entetesSecurite('vendeur', o).some((e) => e.key === 'X-Robots-Tag'));
});
