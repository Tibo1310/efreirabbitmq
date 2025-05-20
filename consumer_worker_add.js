const amqp = require('amqplib');

async function worker() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const queue = 'calc_queue';
  await channel.assertQueue(queue, { durable: false });

  channel.prefetch(1);

  channel.consume(queue, async (msg) => {
    const { n1, n2 } = JSON.parse(msg.content.toString());
    const result = n1 + n2;

    const delay = Math.floor(Math.random() * 10 + 5) * 1000;
    setTimeout(async () => {
      const response = {
        n1,
        n2,
        op: 'add',
        result,
      };

      console.log(`Résultat du calcul: ${JSON.stringify(response)}`);

      await channel.sendToQueue('result_queue', Buffer.from(JSON.stringify(response)));

      channel.ack(msg);
    }, delay);
  });
}

worker().catch(console.error);