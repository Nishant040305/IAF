const http = require('http');

const options = {
  hostname: '10.0.2.2',
  port: 80, // or the actual port, wait let's use the local URL
  path: '/health',
  method: 'GET'
};

fetch('http://127.0.0.1:80/health').then(r => r.json()).then(console.log).catch(console.error);
