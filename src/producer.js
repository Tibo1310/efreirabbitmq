const amqp = require('amqplib');
const config = require('./config/rabbitmq');

async function sendCalculation() {
    try {
        // Connexion à RabbitMQ
        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();

        // S'assurer que la queue existe
        await channel.assertQueue(config.rabbitmq.queues.calculations, {
            durable: false
        });

        // Générer des nombres aléatoires
        const n1 = Math.floor(Math.random() * 100);
        const n2 = Math.floor(Math.random() * 100);
        const operations = ['add', 'sub', 'mul', 'div'];
        const op = operations[Math.floor(Math.random() * operations.length)];

        const message = {
            n1,
            n2,
            op
        };

        // Envoyer le message
        channel.sendToQueue(
            config.rabbitmq.queues.calculations,
            Buffer.from(JSON.stringify(message))
        );

        console.log(" [x] Envoyé %s", JSON.stringify(message));

    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Envoyer un calcul toutes les 5 secondes
setInterval(sendCalculation, 5000);
console.log(' [*] Producteur démarré. Envoi de calculs toutes les 5 secondes.'); 