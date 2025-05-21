const amqp = require('amqplib');
const config = require('./config/rabbitmq');

// Récupérer le type d'opération depuis les arguments ou l'environnement
const operation = process.env.OPERATION || process.argv[2] || 'add';

// Fonction pour effectuer le calcul selon l'opération
function calculate(n1, n2, op) {
    // Convertir en BigInt si nécessaire
    if (typeof n1 === 'number' && !Number.isSafeInteger(n1)) {
        n1 = BigInt(n1);
    }
    if (typeof n2 === 'number' && !Number.isSafeInteger(n2)) {
        n2 = BigInt(n2);
    }

    switch(op) {
        case 'add': 
            return typeof n1 === 'bigint' || typeof n2 === 'bigint' 
                ? BigInt(n1) + BigInt(n2)
                : n1 + n2;
        case 'sub': 
            return typeof n1 === 'bigint' || typeof n2 === 'bigint'
                ? BigInt(n1) - BigInt(n2)
                : n1 - n2;
        case 'mul': 
            return typeof n1 === 'bigint' || typeof n2 === 'bigint'
                ? BigInt(n1) * BigInt(n2)
                : n1 * n2;
        case 'div': 
            if (n2 === 0 || n2 === BigInt(0)) return 'Division par zéro';
            return typeof n1 === 'bigint' || typeof n2 === 'bigint'
                ? Number(BigInt(n1)) / Number(BigInt(n2))
                : n1 / n2;
        default: 
            return null;
    }
}

async function processMessage(channel, data) {
    console.log(` [x] Reçu ${JSON.stringify(data)}`);

    // Simuler un calcul complexe (attente aléatoire entre 5 et 15 secondes)
    const waitTime = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Effectuer le calcul
    const result = calculate(data.n1, data.n2, operation);

    // Convertir BigInt en string pour JSON
    const response = {
        n1: typeof data.n1 === 'bigint' ? data.n1.toString() : data.n1,
        n2: typeof data.n2 === 'bigint' ? data.n2.toString() : data.n2,
        op: operation,
        result: typeof result === 'bigint' ? result.toString() : result,
        isAutomatic: data.isAutomatic,
        originalOp: data.op
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

        // Configurer l'exchange pour les opérations individuelles
        await channel.assertExchange('operations', 'direct', {
            durable: false
        });

        // Configurer l'exchange pour les opérations 'all'
        await channel.assertExchange(config.rabbitmq.exchanges.all_operations, 'fanout', {
            durable: false
        });

        // Créer une queue dédiée pour ce type d'opération
        const operationQueue = await channel.assertQueue(`${operation}_queue`, {
            durable: false
        });

        // Lier la queue à l'exchange avec la clé de routage appropriée
        await channel.bindQueue(operationQueue.queue, 'operations', operation);

        // Créer une queue exclusive pour les opérations 'all'
        const allQueue = await channel.assertQueue('', { exclusive: true });
        await channel.bindQueue(allQueue.queue, config.rabbitmq.exchanges.all_operations, '');

        console.log(` [*] Worker ${operation} en attente de calculs`);

        // Écouter les messages pour les opérations individuelles
        channel.consume(operationQueue.queue, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                await processMessage(channel, data);
                channel.ack(msg);
            }
        });

        // Écouter les messages pour l'opération 'all'
        channel.consume(allQueue.queue, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                if (data.op === 'all') {
                    await processMessage(channel, data);
                }
                channel.ack(msg);
            }
        });

    } catch (error) {
        console.error('Erreur:', error);
        setTimeout(start, 5000);
    }
}

start(); 