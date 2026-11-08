/**
 * Lance les tests SQL uniquement si l'environnement le permet.
 * Sur Windows sans bash/WSL fonctionnel ou sans psql, le test est ignoré
 * (CI Linux exécute réellement les scripts).
 */
import { spawnSync } from 'node:child_process';

function disponible(cmd, args) {
  const r = spawnSync(cmd, args, { shell: true, stdio: 'ignore' });
  return r.status === 0;
}

if (!disponible('psql', ['--version'])) {
  console.log('DB tests skipped: psql not found (run with a local Supabase instance)');
  process.exit(0);
}
if (!disponible('bash', ['--version'])) {
  console.log('DB tests skipped: bash not available on this platform');
  process.exit(0);
}

const resultat = spawnSync('bash', ['./scripts/ci-test.sh'], { stdio: 'inherit', shell: true });
process.exit(resultat.status ?? 1);
