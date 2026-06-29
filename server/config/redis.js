const { createClient } = require('redis');

const client = createClient({
  url: 'redis://127.0.0.1:6379'
});

client.on('error', (err) => console.log('Redis Error:', err));
client.on('connect', () => console.log('Redis connected'));

(async () => {
  await client.connect();
})();

module.exports = client;
