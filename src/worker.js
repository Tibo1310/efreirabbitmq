const amqp = require('amqplib');
const config = require('./config/rabbitmq');

// Récupérer le type d'opération depuis les arguments ou l'environnement
const operation = process.env.OPERATION || process.argv[2] || 'add';

// Fonction pour effectuer le calcul selon l'opération
function calculate(n1, n2, op) {
    switch(op) {
        case 'add': return n1 + n2;
        case 'sub': return n1 - n2;
        case 'mul': return n1 * n2;
        case 'div': return n2 !== 0 ? n1 / n2 : 'Division par zéro';
        default: return null;
    }
}

async function processMessage(channel, data) {
    console.log(` [x] Reçu ${JSON.stringify(data)}`);

    // Simuler un calcul complexe (attente aléatoire entre 5 et 15 secondes)
    const waitTime = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Effectuer le calcul
    const result = calculate(data.n1, data.n2, operation);

    // Envoyer le résultat
    const response = {
        n1: data.n1,
        n2: data.n2,
        op: operation,
        result: result
    };

    channel.sendToQueue(
        config.rabbitmq.queues.results,
        Buffer.from(JSON.stringify(response))
    );

    console.log(` [x] Envoyé ${JSON.stringify(response)}`);
}

async function start() {
    try {
        // Connexion à RabbitMQ
        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();

        // S'assurer que les queues existent
        await channel.assertQueue(config.rabbitmq.queues.calculations, { durable: false });
        await channel.assertQueue(config.rabbitmq.queues.results, { durable: false });

        // Configurer l'exchange pour les opérations 'all'
        await channel.assertExchange(config.rabbitmq.exchanges.all_operations, 'fanout', {
            durable: false
        });

        // Créer une queue exclusive pour ce worker
        const q = await channel.assertQueue('', { exclusive: true });
        await channel.bindQueue(q.queue, config.rabbitmq.exchanges.all_operations, '');

        console.log(` [*] Worker ${operation} en attente de calculs`);

        // Écouter les messages de la queue normale
        channel.consume(config.rabbitmq.queues.calculations, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                if (data.op === operation) {
                    await processMessage(channel, data);
                }
                channel.ack(msg);
            }
        });

        // Écouter les messages de l'exchange 'all'
        channel.consume(q.queue, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                await processMessage(channel, data);
                channel.ack(msg);
            }
        });

    } catch (error) {
        console.error('Erreur:', error);
    }
}

start(); 