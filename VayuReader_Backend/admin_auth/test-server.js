// Quick test script to verify the server setup
const app = require('./server');

// Wait a moment for server to start
setTimeout(() => {
  console.log('\n=== Testing Routes ===');
  console.log('Server should be running on port 3002');
  console.log('Test these endpoints:');
  console.log('1. GET http://localhost:3002/health');
  console.log('2. POST http://localhost:3002/api/auth/login');
  console.log('   Body: { "name": "Himanshu Bhatt", "contact": "89200 67341" }');
  console.log('\nPress Ctrl+C to stop the server\n');
}, 1000);

