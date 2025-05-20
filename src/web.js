const express = require('express');
const amqp = require('amqplib');
const config = require('./config/rabbitmq');

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

app.get('/', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculateur Distribué</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Roboto', sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #333; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2196F3; text-align: center; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; color: #666; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
        input:focus, select:focus { outline: none; border-color: #2196F3; box-shadow: 0 0 0 2px rgba(33,150,243,0.1); }
        button { background: #2196F3; color: white; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 16px; transition: background-color 0.3s; }
        button:hover { background: #1976D2; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .results { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        .result-item { background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 4px; border-left: 4px solid #2196F3; }
        .error { color: #d32f2f; font-size: 14px; margin-top: 5px; }
        .loading { display: none; text-align: center; margin: 20px 0; }
        .loading::after { content: ''; display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #2196F3; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .toast { position: fixed; top: 20px; right: 20px; padding: 15px 20px; background: #4CAF50; color: white; border-radius: 4px; display: none; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    </style>
</head>
<body>
    <div class="container">
        <h1>Calculateur Distribué</h1>
        <form id="calcForm">
            <div class="form-group">
                <label>Premier nombre:</label>
                <input type="number" name="n1" required step="any">
                <div class="error" id="n1Error"></div>
            </div>
            <div class="form-group">
                <label>Second nombre:</label>
                <input type="number" name="n2" required step="any">
                <div class="error" id="n2Error"></div>
            </div>
            <div class="form-group">
                <label>Opération:</label>
                <select name="op" required>
                    <option value="add">Addition (+)</option>
                    <option value="sub">Soustraction (-)</option>
                    <option value="mul">Multiplication (×)</option>
                    <option value="div">Division (÷)</option>
                    <option value="all">Toutes les opérations</option>
                </select>
            </div>
            <button type="submit" id="submitBtn">Calculer</button>
            <div class="loading" id="loading"></div>
        </form>
        <div class="results">
            <h2>Interface d'administration (historique):</h2>
            <div id="resultsList"></div>
        </div>
    </div>
    <div class="toast" id="toast"></div>

    <script>
    (function() {
        function showToast(message, type) {
            const toast = document.getElementById('toast');
            if (toast) {
                toast.textContent = message;
                toast.style.background = type === 'error' ? '#d32f2f' : '#4CAF50';
                toast.style.display = 'block';
                setTimeout(() => {
                    toast.style.display = 'none';
                }, 3000);
            }
        }

        function validateInputs(n1, n2, op) {
            const n1Error = document.getElementById('n1Error');
            const n2Error = document.getElementById('n2Error');
            
            if (n1Error) n1Error.textContent = '';
            if (n2Error) n2Error.textContent = '';

            if (isNaN(n1)) {
                if (n1Error) n1Error.textContent = "Veuillez entrer un nombre valide";
                return false;
            }

            if (isNaN(n2)) {
                if (n2Error) n2Error.textContent = "Veuillez entrer un nombre valide";
                return false;
            }

            if (op === 'div' && n2 === 0) {
                if (n2Error) n2Error.textContent = "La division par zéro n'est pas permise";
                return false;
            }

            return true;
        }

        function addResult(result) {
            const resultsList = document.getElementById('resultsList');
            if (!resultsList) return;

            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            const symbols = { add: '+', sub: '-', mul: '×', div: '÷' };
            const operationSymbol = symbols[result.op] || result.op;

            resultItem.textContent = result.n1 + " " + operationSymbol + " " + result.n2 + " = " + result.result;
            resultsList.insertBefore(resultItem, resultsList.firstChild);
        }

        function handleSubmit(event) {
            event.preventDefault();

            const form = event.target;
            const formData = new FormData(form);
            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');

            const n1 = Number(formData.get('n1'));
            const n2 = Number(formData.get('n2'));
            const op = formData.get('op');

            if (!validateInputs(n1, n2, op)) return;

            if (submitBtn) submitBtn.disabled = true;
            if (loading) loading.style.display = 'block';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            fetch('/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ n1, n2, op }),
                signal: controller.signal
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast("Calcul envoyé avec succès!");
                    form.reset();
                } else {
                    showToast(data.message || "Erreur inconnue", 'error');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                showToast(error.message || "Erreur lors de l'envoi du calcul", 'error');
            })
            .finally(() => {
                clearTimeout(timeoutId);
                if (submitBtn) submitBtn.disabled = false;
                if (loading) loading.style.display = 'none';
            });
        }

        function checkResult() {
            fetch('/last-result')
                .then(response => response.json())
                .then(data => {
                    if (data) {
                        addResult(data);
                    }
                })
                .catch(error => console.error('Erreur:', error));
        }

        // Vérifier les résultats toutes les 1 secondes
        setInterval(checkResult, 1000);

        const form = document.getElementById('calcForm');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }
    })();
    </script>
</body>
</html>`;
    res.send(html);
});

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
    // Réinitialiser le résultat après l'avoir envoyé
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