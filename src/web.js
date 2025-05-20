const express = require('express');
const amqp = require('amqplib');
const config = require('./config/rabbitmq');

const app = express();
const port = process.env.PORT || 3000;

// Variables pour stocker la connexion RabbitMQ
let connection = null;
let channel = null;

// Fonction pour initialiser la connexion RabbitMQ
async function connectQueue() {
    try {
        connection = await amqp.connect(config.rabbitmq.url);
        channel = await connection.createChannel();
        
        await channel.assertQueue(config.rabbitmq.queues.calculations, {
            durable: false
        });
        
        console.log('Connecté à RabbitMQ');
    } catch (error) {
        console.error('Erreur de connexion à RabbitMQ:', error);
        // Réessayer la connexion après un délai
        setTimeout(connectQueue, 5000);
    }
}

// Initialiser la connexion au démarrage
connectQueue();

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Page d'accueil
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Calculateur Distribué</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .form-group { margin-bottom: 15px; }
                    .results { margin-top: 20px; }
                </style>
            </head>
            <body>
                <h1>Calculateur Distribué</h1>
                <form id="calcForm" onsubmit="handleSubmit(event)">
                    <div class="form-group">
                        <label>Premier nombre:</label>
                        <input type="number" name="n1" required>
                    </div>
                    <div class="form-group">
                        <label>Second nombre:</label>
                        <input type="number" name="n2" required>
                    </div>
                    <div class="form-group">
                        <label>Opération:</label>
                        <select name="op">
                            <option value="add">Addition</option>
                            <option value="sub">Soustraction</option>
                            <option value="mul">Multiplication</option>
                            <option value="div">Division</option>
                            <option value="all">Toutes</option>
                        </select>
                    </div>
                    <button type="submit">Calculer</button>
                </form>
                <div class="results" id="results">
                    <h2>Résultats</h2>
                    <pre id="resultsList"></pre>
                </div>
                <script>
                    async function handleSubmit(event) {
                        event.preventDefault();
                        const form = event.target;
                        const formData = new FormData(form);
                        
                        try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes timeout

                            const response = await fetch('/calculate', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    n1: Number(formData.get('n1')),
                                    n2: Number(formData.get('n2')),
                                    op: formData.get('op')
                                }),
                                signal: controller.signal
                            });
                            
                            clearTimeout(timeoutId);
                            
                            if (response.ok) {
                                const result = await response.json();
                                alert('Calcul envoyé avec succès!');
                                form.reset();
                            } else {
                                const errorData = await response.json();
                                alert("Erreur lors de l'envoi du calcul: " + (errorData.message || 'Erreur inconnue'));
                            }
                        } catch (error) {
                            console.error('Erreur:', error);
                            alert("Erreur lors de l'envoi du calcul: " + error.message);
                        }
                    }
                </script>
            </body>
        </html>
    `);
});

// Route pour soumettre un calcul
app.post('/calculate', async (req, res) => {
    try {
        if (!channel) {
            throw new Error('La connexion à RabbitMQ n\'est pas établie');
        }

        const { n1, n2, op } = req.body;
        const message = {
            n1: Number(n1),
            n2: Number(n2),
            op
        };

        channel.sendToQueue(
            config.rabbitmq.queues.calculations,
            Buffer.from(JSON.stringify(message))
        );

        res.json({ success: true, message: 'Calcul envoyé avec succès' });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du traitement de la demande',
            error: error.message
        });
    }
});

// Gérer la fermeture propre de la connexion
process.on('SIGINT', async () => {
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
    } catch (error) {
        console.error('Erreur lors de la fermeture de la connexion:', error);
    }
    process.exit(0);
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Interface web disponible sur http://localhost:${port}`);
}); 