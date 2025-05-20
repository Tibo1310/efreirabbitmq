require('dotenv').config();

const config = {
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://localhost',
        queues: {
            calculations: process.env.QUEUE_NAME || 'calculations',
            results: process.env.RESULT_QUEUE || 'results'
        },
        exchanges: {
            all_operations: 'all_operations'
        }
    }
};

module.exports = config; 