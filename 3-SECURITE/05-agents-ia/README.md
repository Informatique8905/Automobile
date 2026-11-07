# 05 — Agents IA de sécurité

Code exécuté par l'API Render (`POST /interne/taches/executer`, déclenché toutes les 5 minutes par la base).
Le pilotage (mode, seuils, budget) se fait dans le back-office, table `ai_agents`.

## Les 10 agents (+ 1 synthèse quotidienne)

| # | Agent | Déclenché par | Méthode | Mode au départ | Effet maximal autorisé |
|---|---|---|---|---|---|
| 1 | Modération des annonces | Annonce soumise | IA + règles | auto | Remettre l'annonce en revue ; publier si risque ≤ 30 et partenaire vérifié |
| 2 | Modération des photos | Photo ajoutée | IA (vision) | auto | Masquer la photo |
| 3 | Filtrage de la messagerie | Message envoyé | IA + règles | auto | Masquer le message |
| 4 | Modération des avis | Avis publié | IA + règles | auto | Masquer l'avis |
| 5 | Pré-contrôle des documents | Document déposé | Règles | assist | Note pour le modérateur (**jamais** de décision KYC) |
| 6 | Risque des réservations | Réservation créée | Règles | assist | Signal de fraude |
| 7 | Connexions suspectes | Événement de sécurité grave | Règles | shadow | Signal + alerte au titulaire du compte |
| 8 | Comptes de versement | Nouveau compte ajouté | Règles | shadow | Signal (le délai de 72 h s'applique toujours) |
| 9 | Risque des paiements | 3 échecs en 1 h | Règles | shadow | Signal de fraude |
| 10 | Photos copiées | Empreinte de photo calculée | Règles | shadow | Masquer la photo (copie quasi identique) |
| — | Synthèse sécurité | 1×/jour | IA sur des compteurs | — | E-mail aux administrateurs |

**Pourquoi des règles et pas l'IA pour 5 à 10** : ces décisions touchent des personnes et de l'argent. Elles
doivent être explicables (« 12 échecs en 10 minutes »), reproductibles, et ne jamais faire sortir une pièce
d'identité vers un prestataire IA. L'IA sert là où elle excelle : comprendre un texte ou une image.

## Les garde-fous (`src/garde-fous.ts`)

1. **Minimisation** : téléphones (+225…), e-mails, numéros de carte et IBAN remplacés par des marqueurs avant l'envoi.
2. **Encadrement anti-injection** : le texte des utilisateurs est placé entre des balises au nom aléatoire,
   avec la consigne de ne jamais suivre ce qu'il contient. Une tentative (« ignore tes règles ») est elle-même
   détectée par les règles et fait monter le score.
3. **JSON strict** : une réponse mal formée fait échouer la tâche (nouvel essai), jamais un « pass » par défaut.
4. **Le plus prudent gagne** : verdict IA et verdict des règles sont combinés, on garde le pire.
5. **La base a le dernier mot** (`complete_ai_job`) : un « block » sous le seuil devient « flag » ; un agent en
   `shadow` n'a aucun effet ; un agent en `assist` ne masque jamais ; aucune suppression, aucune sanction.
6. **Traçabilité** : chaque décision est enregistrée dans `ai_agent_runs` avec l'empreinte SHA-256 de
   l'entrée (pas l'entrée elle-même), le modèle, les tokens, le coût et la durée.
7. **Budget** : au-delà du budget quotidien d'un agent, la base cesse de lui distribuer des tâches.

## Mise en service d'un agent

```
shadow (2 semaines)  →  revue des décisions dans le back-office  →  assist  →  auto
                         critère : ≥ 95 % d'accord sur les « block », ≤ 5 % de faux « block »
```
L'interrupteur d'urgence (`off`) arrête un agent immédiatement ; ses tâches attendent son retour.

## Fichiers

```
src/
  types.ts            types partagés (tâche, verdict, entrée, fournisseur)
  garde-fous.ts       masquage, encadrement, validation, combinaison
  pre-filtre.ts       règles anti-contournement et anti-arnaque (instantanées)
  fournisseur-llm.ts  interface modèle IA + implémentation HTTP (interchangeable)
  executer.ts         exécution d'un agent sur une tâche
  worker.ts           boucle « réclamer → analyser → rendre le verdict »
  synthese.ts         synthèse sécurité quotidienne
  agents/contenus.ts  agents 1 à 4 (IA)
  agents/securite.ts  agents 5 à 10 (règles)
  agents.test.ts      9 tests (injection de prompt, JSON invalide, photo volée, prise de contrôle…)
  evaluer.ts          rejoue les exemples d'évaluation
prompts/              consignes versionnées (nom.v1.md) — changer de version = ai_agents.prompt_version
evaluations/          exemples réels anonymisés avec la décision attendue
```

```bash
pnpm --filter @plateforme/agents-ia test      # 9 tests
pnpm --filter @plateforme/agents-ia evaluer   # taux d'accord sur les exemples
```

## Variables (API Render)

`LLM_PROVIDER`, `LLM_API_KEY`, `LLM_DEFAULT_MODEL`, `LLM_PRIX_ENTREE_USD_PAR_MTOK`, `LLM_PRIX_SORTIE_USD_PAR_MTOK`
(les deux tarifs sont nécessaires pour que le budget quotidien s'applique).

> Données personnelles : l'envoi de textes d'utilisateurs à un prestataire IA situé hors de Côte d'Ivoire est un
> transfert de données. À inscrire dans la déclaration ARTCI (voir `03-protection-des-donnees`).
