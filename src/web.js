const express = require('express');
const amqp = require('amqplib');
const config = require('./config/rabbitmq');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Variables pour stocker la connexion RabbitMQ
let connection = null;
let channel = null;

// Variables pour stocker les résultats
let lastAutoResult = null;  // Pour les calculs automatiques
let lastUserResult = null;  // Pour les calculs manuels
let pendingAllResults = new Map(); // Pour stocker les résultats de l'opération "all"

// Fonction pour initialiser la connexion RabbitMQ
async function connectQueue() {
    try {
        connection = await amqp.connect(config.rabbitmq.url);
        channel = await connection.createChannel();
        
        // Configurer l'exchange pour les opérations individuelles
        await channel.assertExchange('operations', 'direct', {
            durable: false
        });

        // Configurer l'exchange pour les opérations 'all'
        await channel.assertExchange(config.rabbitmq.exchanges.all_operations, 'fanout', {
            durable: false
        });

        // S'assurer que la queue des résultats existe
        await channel.assertQueue(config.rabbitmq.queues.results, {
            durable: false
        });

        // Écouter les résultats
        channel.consume(config.rabbitmq.queues.results, (msg) => {
            if (msg !== null) {
                const result = JSON.parse(msg.content.toString());
                
                // Convertir les grands nombres en BigInt si nécessaire
                if (typeof result.n1 === 'number' && !Number.isSafeInteger(result.n1)) {
                    result.n1 = BigInt(result.n1);
                }
                if (typeof result.n2 === 'number' && !Number.isSafeInteger(result.n2)) {
                    result.n2 = BigInt(result.n2);
                }
                
                if (result.isAutomatic) {
                    lastAutoResult = result;
                } else {
                    if (result.originalOp === 'all') {
                        // Créer une clé unique pour chaque groupe de résultats "all"
                        const resultKey = `${result.n1}-${result.n2}`;
                        
                        if (!pendingAllResults.has(resultKey)) {
                            pendingAllResults.set(resultKey, {
                                results: [],
                                timestamp: Date.now()
                            });
                        }
                        
                        const pendingResult = pendingAllResults.get(resultKey);
                        pendingResult.results.push(result);
                        
                        // Si nous avons tous les résultats (4 opérations)
                        if (pendingResult.results.length === 4) {
                            // Trier les résultats dans l'ordre : add, sub, mul, div
                            const sortedResults = pendingResult.results.sort((a, b) => {
                                const order = { 'add': 0, 'sub': 1, 'mul': 2, 'div': 3 };
                                return order[a.op] - order[b.op];
                            });
                            
                            lastUserResult = {
                                type: 'all',
                                results: sortedResults,
                                n1: result.n1,
                                n2: result.n2,
                                timestamp: pendingResult.timestamp
                            };
                            
                            pendingAllResults.delete(resultKey);
                        }
                    } else {
                        lastUserResult = {
                            ...result,
                            timestamp: Date.now()
                        };
                    }
                }
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

// Route pour le calcul manuel
app.post('/calculate', async (req, res) => {
    try {
        if (!channel) {
            throw new Error("La connexion à RabbitMQ n'est pas établie");
        }

        const { n1, n2, op } = req.body;

        if (isNaN(n1) || isNaN(n2)) {
            throw new Error("Les valeurs entrées doivent être des nombres");
        }

        if (op === 'div' && Number(n2) === 0) {
            throw new Error("La division par zéro n'est pas permise");
        }

        const message = {
            n1: Number(n1),
            n2: Number(n2),
            op,
            isAutomatic: false
        };

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

        res.json({ success: true, message: 'Calcul envoyé avec succès' });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Erreur lors du traitement de la demande'
        });
    }
});

// Route pour récupérer le dernier résultat automatique
app.get('/last-auto-result', (req, res) => {
    res.json(lastAutoResult);
    lastAutoResult = null;
});

// Route pour récupérer le dernier résultat manuel
app.get('/last-user-result', (req, res) => {
    if (lastUserResult) {
        const result = lastUserResult;
        lastUserResult = null;
        res.json(result);
    } else {
        res.json(null);
    }
});

// Nettoyage périodique des résultats en attente (toutes les minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of pendingAllResults.entries()) {
        if (now - data.timestamp > 60000) { // Supprimer après 1 minute
            pendingAllResults.delete(key);
        }
    }
}, 60000);

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