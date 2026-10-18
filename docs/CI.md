# Vérifications GitHub et locales

Les workflows `CI` et `Security` se lancent sur les PR, sur les poussées vers `main` et manuellement depuis GitHub Actions.

## CI fonctionnelle

- Backend : installation verrouillée, migrations, seed éditorial, build, puis toutes les suites Jest unitaires et HTTP/PostgreSQL (`npm test -- --runInBand`).
- Frontend : installation verrouillée, build et tests Jest.
- PostgreSQL utilise une base jetable `captivia_ci_test`. Ne jamais fournir une URL de production aux tests.
- Les suites agenda/habitats conservent leurs bases locales dédiées et acceptent la base CI uniquement avec `CI=true` et une adresse loopback. Les gardes sont couvertes par des tests de refus des bases distantes/partagées.
- Les suites HTTP concurrentes maintiennent un listener jusqu’à la fin de la suite pour éviter les fermetures concurrentes par Supertest.
- Les intégrations backend sont déjà comprises dans la commande Jest complète : aucun second job manuel redondant n’est nécessaire.

## Sécurité des dépendances

Les audits backend et frontend sont indépendants et incluent les dépendances de développement. Le seuil reste `npm audit --audit-level=high`. Aucune alerte élevée n’est ignorée.

Au 18 octobre 2026, les mises à jour éliminent toutes les alertes élevées/critiques backend. L’audit de production frontend ne signale aucune vulnérabilité ; celui du backend conserve des alertes modérées dans Swagger/js-yaml, sans alerte élevée ou critique.

L’audit complet frontend reste en échec pour [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) : `braces` (<=3.0.3), via `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch`. La version publiée la plus récente de `braces` est 3.0.3 et aucune version corrigée n’est déclarée dans l’avis. Cette dépendance sert à l’outillage de développement, pas aux dépendances de production. Reprendre la mise à jour dès publication d’un correctif compatible ; ne pas abaisser le seuil ni supprimer cet audit pour obtenir artificiellement un résultat vert.

`deepmerge-ts` est surchargé en version 8 pour corriger la dépendance de configuration de Prisma 6. Les migrations, le seed, le build et les tests vérifient cette combinaison. Nodemailer est mis à jour en version 10 et ses tests de livraison sont exécutés.

## Lint facultatif

Le lint était déjà non bloquant et ses erreurs étaient masquées par `|| true`, sans installation des dépendances. Les jobs installent désormais les outils verrouillés et exposent leur véritable résultat, en conservant leur caractère informatif. L’état initial après ces corrections contient 1 901 erreurs backend et 76 erreurs frontend (formatage, typage et règles React). Ces résultats ne sont pas présentés comme une validation réussie du lint ; leur résorption complète constitue un chantier distinct.

## Résultats locaux

Après les mises à jour : 492 tests backend (31 suites), 205 tests frontend (22 suites) et les deux builds réussis. Les migrations et le seed sont exécutés exclusivement sur une base PostgreSQL jetable. Aucune base de production n’est modifiée.
