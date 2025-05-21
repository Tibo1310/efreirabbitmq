const express = require('express');
const amqp = require('amqplib');
const config = require('./config/rabbitmq');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Variables pour stocker la connexion RabbitMQ
let connection = null;
let channel = null;

// Variable pour stocker le dernier résultat
let lastResult = null;

// Fonction pour initialiser la connexion RabbitMQ
async function connectQueue() {
    try {
        connection = await amqp.connect(config.rabbitmq.url);
        channel = await connection.createChannel();
        
        await channel.assertQueue(config.rabbitmq.queues.calculations, {
            durable: false
        });

        await channel.assertQueue(config.rabbitmq.queues.results, {
            durable: false
        });

        await channel.assertExchange(config.rabbitmq.exchanges.all_operations, 'fanout', {
            durable: false
        });

        // Écouter les résultats
        channel.consume(config.rabbitmq.queues.results, (msg) => {
            if (msg !== null) {
                lastResult = JSON.parse(msg.content.toString());
                channel.ack(msg);
            }
        });
        
        console.log('Connecté à RabbitMQ');
    } catch (error) {
        console.error('Erreur de connexion à RabbitMQ:', error);
        setTimeout(connectQueue, 5000);
    }
}

connectQueue();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour le calcul
app.post('/calculate', async (req, res) => {
    try {
        if (!channel) {
            throw new Error("La connexion à RabbitMQ n'est pas établie");
        }

        const { n1, n2, op } = req.body;

        if (isNaN(n1) || isNaN(n2)) {
            throw new Error("Les valeurs entrées doivent être des nombres");
        }

        if (op === 'div' && n2 === 0) {
            throw new Error("La division par zéro n'est pas permise");
        }

        const message = {
            n1: Number(n1),
            n2: Number(n2),
            op
        };

        if (op === 'all') {
            channel.publish(
                config.rabbitmq.exchanges.all_operations,
                '',
                Buffer.from(JSON.stringify(message))
            );
        } else {
            channel.sendToQueue(
                config.rabbitmq.queues.calculations,
                Buffer.from(JSON.stringify(message))
            );
        }

        res.json({ success: true, message: 'Calcul envoyé avec succès' });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Erreur lors du traitement de la demande'
        });
    }
});

// Route pour récupérer le dernier résultat
app.get('/last-result', (req, res) => {
    res.json(lastResult);
    lastResult = null;
});

process.on('SIGINT', async () => {
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
    } catch (error) {
        console.error('Erreur lors de la fermeture de la connexion:', error);
    }
    process.exit(0);
});

app.listen(port, () => {
    console.log(`Interface web disponible sur http://localhost:${port}`);
}); 