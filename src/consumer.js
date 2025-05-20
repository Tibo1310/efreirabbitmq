const amqp = require('amqplib');
const config = require('./config/rabbitmq');

async function start() {
    try {
        // Connexion à RabbitMQ
        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();

        // S'assurer que la queue existe
        await channel.assertQueue(config.rabbitmq.queues.results, {
            durable: false
        });

        console.log(' [*] En attente de résultats. Pour sortir, pressez CTRL+C');

        // Écouter les résultats
        channel.consume(config.rabbitmq.queues.results, (msg) => {
            if (msg !== null) {
                const result = JSON.parse(msg.content.toString());
                console.log(' [x] Résultat reçu:', result);
                console.log(`     ${result.n1} ${result.op} ${result.n2} = ${result.result}`);
                channel.ack(msg);
            }
        });

    } catch (error) {
        console.error('Erreur:', error);
    }
}

start(); 