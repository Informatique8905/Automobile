# Évaluations des agents

Avant de passer un agent de « shadow » à « assist » ou « auto », on vérifie qu'il ne régresse pas.

- `messages.jsonl` : exemples réels anonymisés avec la décision attendue (à enrichir chaque mois avec
  les cas tranchés par les modérateurs).
- `pnpm --filter @plateforme/agents-ia evaluer` : rejoue les exemples avec les règles (et le modèle si
  `LLM_API_KEY` est défini) et affiche le taux d'accord.

Règle de passage : **≥ 95 % d'accord sur les « block »** et **≤ 5 % de faux « block »** sur 2 semaines
en mode observation, puis validation par un administrateur dans le back-office.
