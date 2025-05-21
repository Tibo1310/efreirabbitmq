# Système de Calcul Distribué avec RabbitMQ

Ce projet implémente un système de calcul distribué utilisant RabbitMQ comme broker de messages. Il permet d'effectuer des opérations mathématiques de manière distribuée avec simulation de temps de calcul.

## Schéma de notre architecture

```

Configuration:
-------------
- RabbitMQ Management : http://localhost:15672
- Interface Web : http://localhost:3000
- Connexion RabbitMQ : amqp://guest:guest@rabbitmq:5672

Exchanges:
---------
1. operations (direct) : Pour les opérations individuelles
   - Routing keys : 'add', 'sub', 'mul', 'div'
   - Chaque worker est lié à sa propre queue avec sa clé de routage

2. all_operations (fanout) : Pour l'opération "all"
   - Pas de routing key (broadcast à tous les workers)
   - Chaque worker crée une queue exclusive temporaire

Queues:
-------
1. Queues permanentes :
   - add_queue : Queue dédiée aux additions
   - sub_queue : Queue dédiée aux soustractions
   - mul_queue : Queue dédiée aux multiplications
   - div_queue : Queue dédiée aux divisions
   - results : Queue pour tous les résultats

2. Queues temporaires :
   - Créées automatiquement pour l'exchange fanout (all_operations)
   - Une par worker pour les opérations "all"
   - Supprimées à la déconnexion des workers

Bindings:
--------
- operations (exchange) → add_queue (routing_key: 'add')
- operations (exchange) → sub_queue (routing_key: 'sub')
- operations (exchange) → mul_queue (routing_key: 'mul')
- operations (exchange) → div_queue (routing_key: 'div')
- all_operations (exchange) → queues temporaires (fanout)

Workers:
-------
- worker-add : Additions (écoute add_queue + all_operations)
- worker-sub : Soustractions (écoute sub_queue + all_operations)
- worker-mul : Multiplications (écoute mul_queue + all_operations)
- worker-div : Divisions (écoute div_queue + all_operations)

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
