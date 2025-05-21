const amqp = require('amqplib');
const config = require('./config/rabbitmq');

async function connectQueue() {
    try {
        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();

        // Configurer l'exchange pour les opérations individuelles
        await channel.assertExchange('operations', 'direct', {
            durable: false
        });

        // Configurer l'exchange pour les opérations 'all'
        await channel.assertExchange(config.rabbitmq.exchanges.all_operations, 'fanout', {
            durable: false
        });

        // Fonction pour générer un nombre aléatoire entre min et max
        function getRandomNumber(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        // Fonction pour obtenir une opération aléatoire
        function getRandomOperation() {
            const operations = ['add', 'sub', 'mul', 'div', 'all'];
            return operations[Math.floor(Math.random() * operations.length)];
        }

        // Envoyer un message toutes les 5 secondes
        setInterval(() => {
            const n1 = getRandomNumber(1, 100);
            const n2 = getRandomNumber(1, 100);
            const op = getRandomOperation();

            const message = {
                n1,
                n2,
                op,
                isAutomatic: true
            };

            console.log(` [x] Envoyé ${JSON.stringify(message)}`);

            if (op === 'all') {
                channel.publish(
                    config.rabbitmq.exchanges.all_operations,
                    '',
                    Buffer.from(JSON.stringify(message))
                );
            } else {
                // Publier dans l'exchange 'operations' avec la clé de routage appropriée
                channel.publish(
                    'operations',
                    op,
                    Buffer.from(JSON.stringify(message))
                );
            }
        }, 5000);

        console.log(" [*] En attente de calculs");
    } catch (error) {
        console.error('Erreur:', error);
        setTimeout(connectQueue, 5000);
    }
}

connectQueue(); 