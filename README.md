# Système de Calcul Distribué avec RabbitMQ

Un système de calcul distribué qui traite des opérations mathématiques en utilisant les files d'attente RabbitMQ. Ce projet démontre la mise en œuvre d'une architecture de calcul distribuée où plusieurs workers traitent différents types d'opérations mathématiques.

## Stack Technologique

- **Langage de Programmation**: Node.js (version 18+ recommandée)
- **Client RabbitMQ**: amqplib 0.10.3
- **Dépendances Additionnelles**: 
  - `dotenv` (pour les variables d'environnement)
  - `express` (pour l'interface web potentielle)
  - `nodemon` (pour le développement)

## Structure du Projet

Le projet se compose de plusieurs éléments :
1. Client Producteur (envoie les demandes de calcul)
2. Workers (traitent les calculs)
3. Client Consommateur (affiche les résultats)
4. Serveur RabbitMQ (broker de messages)

## Instructions d'Installation

1. Installer Node.js 18 ou supérieur
2. Initialiser le projet :
   ```bash
   npm init -y
   ```

3. Installer les dépendances :
   ```bash
   npm install amqplib dotenv express nodemon
   ```

4. Installer le Serveur RabbitMQ (choisir une méthode) :
   - Installation locale : Suivre le [guide d'installation RabbitMQ](https://www.rabbitmq.com/download.html)
   - Docker : 
     ```bash
     docker run -d --hostname my-rabbit --name rabbit-server -p 5672:5672 -p 15672:15672 rabbitmq:3-management
     ```

## Phases du Projet

### Phase 1 : Implémentation de Base
- Implémenter le producteur de base envoyant des messages JSON avec deux opérandes
- Créer un worker pour les opérations d'addition
- Développer le consommateur pour afficher les résultats

### Phase 2 : Opérations Multiples
- Implémenter quatre types de workers :
  - Addition (add)
  - Soustraction (sub)
  - Multiplication (mul)
  - Division (div)
- Modifier le producteur pour sélectionner aléatoirement les types d'opérations
- Mettre à jour le consommateur pour gérer tous les types d'opérations

### Phase 3 : Fonctionnalités Avancées
- Implémenter le type d'opération "all"
- Ajouter le paramétrage des workers
- Augmenter la fréquence des messages

### Phase 4 : Améliorations (Optionnel)
- Interface web pour la saisie manuelle des opérations (avec Express.js)
- Interface d'administration
- Suivi des résultats par client
- Configuration Docker Compose
- Mises à jour en temps réel avec WebSocket

## Format des Messages

### Format de Requête :
```json
{
    "n1": 5,
    "n2": 3,
    "op": "add"  // Peut être : "add", "sub", "mul", "div", "all"
}
```

### Format de Réponse :
```json
{
    "n1": 5,
    "n2": 3,
    "op": "add",
    "result": 8
}
```

## Structure du Projet
```
project/
├── package.json
├── .env
├── src/
│   ├── producer.js
│   ├── consumer.js
│   ├── workers/
│   │   ├── worker.js
│   │   └── workerUtils.js
│   └── config/
│       └── rabbitmq.js
└── README.md
```

## Exécution du Système

1. Démarrer le serveur RabbitMQ

2. Lancer les workers (un ou plusieurs de chaque type) :
   ```bash
   node src/workers/worker.js add
   node src/workers/worker.js sub
   node src/workers/worker.js mul
   node src/workers/worker.js div
   ```

3. Démarrer le consommateur :
   ```bash
   node src/consumer.js
   ```

4. Démarrer le producteur :
   ```bash
   node src/producer.js
   ```

Pour le développement avec rechargement automatique :
```bash
nodemon src/producer.js
nodemon src/consumer.js
nodemon src/workers/worker.js add
```

## Directives de Développement

1. Utiliser les fonctionnalités ES6+
2. Implémenter une gestion appropriée des erreurs
3. Utiliser async/await pour les opérations RabbitMQ
4. Suivre les conventions de style JavaScript standard
5. Ajouter des commentaires JSDoc pour la documentation
6. Utiliser des variables d'environnement pour la configuration

Exemple de fichier .env :
```
RABBITMQ_URL=amqp://localhost
QUEUE_NAME=calculations
RESULT_QUEUE=results
```

## Contribution au Projet

Pour contribuer à ce projet :

1. Créer une nouvelle branche :
   ```bash
   git branch NOM_DE_BRANCHE
   ```

2. Faire vos modifications et les commiter

3. Pour fusionner votre branche dans main :
   ```bash
   git checkout main
   git merge NOM_DE_BRANCHE
   ```

4. Pour mettre à jour votre branche avec main :
   ```bash
   git checkout NOM_DE_BRANCHE
   git merge main
   ```

5. Mettre à jour votre dépôt local :
   ```bash
   git pull
   ```

6. Pousser vos modifications :
   ```bash
   git push
   ```

## Équipe du Projet
- Thibault Delattre
- Florent Lelion
- Florian Germain
