const amqp = require('amqplib');

async function sendRequests() {

    const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const queue = 'calc_queue';
  await channel.assertQueue(queue, { durable: false });

  setInterval(async () => {
      const n1 = Math.floor(Math.random() * 100) + 1;
      const n2 = Math.floor(Math.random() * 100) + 1;

    const message = JSON.stringify({ n1, n2 });

    console.log(`Envoi du calcul: ${message}`);

    channel.sendToQueue(queue, Buffer.from(message));

  }, 5000);
}

sendRequests().catch(console.error);