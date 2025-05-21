# Système de Calcul Distribué avec RabbitMQ

Ce projet implémente un système de calcul distribué utilisant RabbitMQ comme broker de messages. Il permet d'effectuer des opérations mathématiques de manière distribuée avec simulation de temps de calcul.

## Schéma de notre architecture

```
                                                                 ┌──────────────┐
                                                                 │  Interface   │
                                                            ┌───▶│     Web     │
                                                            │    │(localhost:3000)
                                                            │    └──────────────┘
                                                            │
┌──────────────┐     ┌─────────────┐    ┌──────────────┐  │    ┌──────────────┐
│  Producteur  │     │   Queue     │    │   Queue      │  │    │ Consommateur  │
│              │────▶│'calculations'│    │  'results'   │──┴───▶│              │
│ producer.js  │     │             │    │              │       │  consumer.js  │
└──────────────┘     └──────┬──────┘    └──────────────┘       └──────────────┘
                            │                    ▲
                            │                    │
                            ▼                    │
                    ┌──────────────┐            │
                    │   Exchange   │            │
                    │     Type     │            │
                    │   'direct'   │            │
                    └──────┬───────┘            │
                           │                    │
                           │                    │
         ┌────────────────┬┴─────────────┬─────┴────────┐
         │                │              │              │
         ▼                ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐┌──────────────┐┌──────────────┐
│   Worker     │  │    Worker    ││    Worker    ││    Worker    │
│     ADD      │  │     SUB     ││     MUL      ││     DIV      │
│  worker.js   │  │   worker.js  ││   worker.js  ││   worker.js  │
└──────┬───────┘  └──────┬───────┘└──────┬───────┘└──────┬───────┘
       │                 │               │              │
       │                 │               │              │
       └─────────┬───────┴───────┬───────┴──────┬──────┘
                 │               │              │
                 ▼               ▼              ▼
         ┌─────────────────────────────────────────────┐
         │           Exchange 'all_operations'          │
         │               Type: 'fanout'                │
         └─────────────────────────────────────────────┘

Légende:
--------
→ : Flux de messages
│ : Connexion

Configuration:
-------------
- RabbitMQ Management : http://localhost:15672
- Interface Web : http://localhost:3000
- Connexion RabbitMQ : amqp://guest:guest@rabbitmq:5672

Queues:
-------
1. calculations : Queue principale pour les opérations
2. results : Queue pour les résultats

Exchanges:
---------
1. Direct (default) : Pour les opérations individuelles
2. all_operations (fanout) : Pour l'opération "all"

Bindings:
--------
- Workers → calculations (routing key = operation type)
- Workers → all_operations (pas de routing key - fanout)
- Workers → results (pour les réponses)

Workers:
-------
- worker-add : Additions
- worker-sub : Soustractions
- worker-mul : Multiplications
- worker-div : Divisions

Messages:
--------
Requête: {"n1": 5, "n2": 3, "op": "add"}
Réponse: {"n1": 5, "n2": 3, "op": "add", "result": 8}
```

## Technologies Utilisées

- **Node.js** : Runtime JavaScript
- **amqplib** : Librairie AMQP pour Node.js
- **Express** : Framework web pour l'interface utilisateur
- **Docker & Docker Compose** : Conteneurisation et orchestration
- **RabbitMQ** : Message broker

## Architecture

Le système est composé de plusieurs composants :

- **RabbitMQ Server** : Broker de messages central
- **Producteur** : Envoie des requêtes de calcul
- **Workers** : Effectuent les calculs (4 types : add, sub, mul, div)
- **Consommateur** : Affiche les résultats
- **Interface Web** : Interface utilisateur et administration

### Queues et Exchanges

- `calculations` : Queue principale pour les opérations
- `results` : Queue pour les résultats
- `all_operations` : Exchange fanout pour l'opération "all"

## Installation

1. Installer Docker et Docker Compose
2. Cloner le repository
3. Faire un npm i
4. Lancer le système :

```bash
docker-compose up --build
```

## Utilisation

1. Accéder à l'interface web : http://localhost:3000
2. L'interface permet de :
   - Soumettre des calculs manuellement
   - Voir l'historique des opérations
   - Monitorer les résultats en temps réel

## Structure des Messages

### Requête de calcul
```json
{
    "n1": 5,
    "n2": 3,
    "op": "add"  // "add", "sub", "mul", "div", "all"
}
```

### Réponse
```json
{
    "n1": 5,
    "n2": 3,
    "op": "add",
    "result": 8
}
```

## Fonctionnalités

- ✅ Calculs distribués
- ✅ 4 types d'opérations : add, sub, mul, div
- ✅ Opération "all" avec fanout exchange
- ✅ Simulation de calculs complexes (5-15 secondes)
- ✅ Interface web moderne
- ✅ Interface d'administration
- ✅ Containerisation complète
- ✅ Hot-reload en développement

## Architecture Docker

- **rabbitmq** : Service RabbitMQ avec interface de gestion
- **producer** : Service producteur
- **consumer** : Service consommateur
- **web** : Interface web
- **worker-add** : Worker pour l'addition
- **worker-sub** : Worker pour la soustraction
- **worker-mul** : Worker pour la multiplication
- **worker-div** : Worker pour la division

## Développement

Pour lancer en mode développement :
```bash
npm install
docker-compose up --build
```

Les volumes sont configurés pour le hot-reload en développement.

## Monitoring

- Interface RabbitMQ : http://localhost:15672
  - Login : guest
  - Password : guest
- Interface Web : http://localhost:3000

## Sécurité

- Validation des entrées
- Gestion des erreurs (division par zéro)
- Variables d'environnement pour la configuration
- Healthchecks Docker
