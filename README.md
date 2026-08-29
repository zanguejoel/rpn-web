# rpn-web

Portail membre + console d'administration pour la caisse d'entraide RPN
(Association Côte-Nord). Voir `../rpn-web-project-plan.md` pour le plan complet.

## Démarrer

Le backend doit tourner en premier (profil `local`, H2, sans Docker) :

```bash
cd ../spring-boot/rpn-api && java -jar target/rpn-api-0.0.1-SNAPSHOT.jar --spring.profiles.active=local
```

Puis :

```bash
pnpm install
pnpm dev          # http://localhost:5183
```

Vite proxifie `/api` vers `http://localhost:8080`, donc le navigateur ne voit
qu'une seule origine — la topologie visée en production, et ce qui permettra au
cookie de session `httpOnly` de fonctionner sans CORS ni cookie tiers.

Comptes de démonstration (données de seed) :

| Courriel | Rôle | Mot de passe |
|---|---|---|
| `lionel@example.com` | MEMBER | `password123` |
| `tresoriere@example.com` | TREASURER | `password123` |

## Scripts

| Commande | Effet |
|---|---|
| `pnpm dev` | serveur de développement |
| `pnpm build` | `tsc -b` puis build de production |
| `pnpm lint` | oxlint |

## État d'avancement

Implémenté : socle (phase 0), connexion, gardes de rôle, tableau de bord et
**file de validation** (phase 4 — le chemin critique).

Écrans encore en marque-place : portail membre (phase 3) et le reste de la
console (phases 5 à 8). Ils s'annoncent comme non implémentés plutôt que de
faire semblant.

**Session par cookie `httpOnly`.** Le jeton de rafraîchissement est posé par le
serveur dans un cookie `httpOnly` + `Secure` + `SameSite=Strict` que la page ne
peut pas lire ; seul le jeton d'accès, à durée courte, vit en mémoire. Un
rechargement récupère la session en interrogeant le serveur. Rien n'est écrit
dans `localStorage` ni `sessionStorage` — c'est délibéré dans une application
qui affiche des documents bancaires.
