/**
 * Skillora AI — MongoDB-Unavailable Behavior Unit/Integration Verification
 * Tests that AppController marks the service unhealthy and responds with HTTP 503
 * whenever MongoDB connection is in any state other than connected (readyState !== 1).
 */

const { AppController } = require('../dist/app.controller');

async function testMongoUnavailableBehavior() {
  console.log('--- TESTING MONGODB-UNAVAILABLE BEHAVIOR ---');

  // Mock disconnected MongoDB connection (readyState = 0: disconnected)
  const disconnectedConnection = {
    readyState: 0,
  };

  const mockConfigService = {
    get: (key) => {
      if (key === 'QDRANT_URL') return 'http://localhost:6333';
      return null;
    },
  };

  const mockAppService = {
    getHello: () => 'Skillora API',
  };

  const controller = new AppController(mockAppService, disconnectedConnection, mockConfigService);

  let capturedStatusCode = 200;
  const mockResponse = {
    status: (code) => {
      capturedStatusCode = code;
      return mockResponse;
    },
  };

  const healthResult = await controller.getHealth(mockResponse);

  console.log('Captured HTTP Status:', capturedStatusCode);
  console.log('Health Payload:', healthResult);

  if (capturedStatusCode !== 503) {
    throw new Error(`Expected HTTP 503 SERVICE_UNAVAILABLE, got ${capturedStatusCode}`);
  }

  if (healthResult.status !== 'unhealthy') {
    throw new Error(`Expected status 'unhealthy', got ${healthResult.status}`);
  }

  if (healthResult.mongodb !== 'disconnected') {
    throw new Error(`Expected mongodb 'disconnected', got ${healthResult.mongodb}`);
  }

  console.log('✓ Successfully verified: MongoDB unavailability correctly yields HTTP 503 and status "unhealthy".');
}

testMongoUnavailableBehavior()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Failed:', err);
    process.exit(1);
  });
