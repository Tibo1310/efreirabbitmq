FROM node:18

WORKDIR /usr/src/app

# Installer nodemon globalement
RUN npm install -g nodemon

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

# Exposer le port pour l'interface web
EXPOSE 3000

# Variable d'environnement pour le mode de démarrage (producer, consumer, ou worker)
ENV NODE_ENV=production
ENV MODE=producer

# Script de démarrage qui utilisera la variable MODE
CMD ["sh", "-c", "node src/$MODE.js"] 