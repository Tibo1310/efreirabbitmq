const amqp = require('amqplib');

async function receiveResults() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const queue = 'result_queue';
  await channel.assertQueue(queue, { durable: false });

  channel.consume(queue, (msg) => {
    const result = JSON.parse(msg.content.toString());
    console.log(`Résultat reçu: ${JSON.stringify(result)}`);
  });
}

receiveResults().catch(console.error);