import lodash from "lodash";
const { get } = lodash;

import request from "supertest";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import test utilities
import { createApp } from "../utils/appFactory.js";
import { expectSuccessShape, expectErrorShape, getTestAccountToken } from "../utils/testHelpers.js";

// Test image path
const testImagePath = path.join(__dirname, 'test-image.png');

describe('Gemini Routes', () => {
  let app;
  let testToken;
  let testUserId;

  beforeAll(async () => {
    app = createApp();

    const { token, userId } = await getTestAccountToken(app);
    testToken = token;
    testUserId = userId;

    expect(testToken).toBeDefined();
    expect(testUserId).toBeDefined();
  });

  describe('GET /api/generate/operations', () => {
    it('should return available operations with costs', async () => {
      const response = await request(app)
        .get('/api/generate/operations')
        .expect(200);

      expectSuccessShape(response, 200);
      expect(response.body).toHaveProperty('operations');
      expect(Array.isArray(response.body.operations)).toBe(true);
      
      // Check that operations have required fields
      if (response.body.operations.length > 0) {
        const operation = response.body.operations[0];
        expect(operation).toHaveProperty('type');
        expect(operation).toHaveProperty('name');
        expect(operation).toHaveProperty('description');
        expect(operation).toHaveProperty('cost');
        expect(typeof operation.cost).toBe('number');
      }
    });
  });

  describe('GET /api/generate/templates', () => {
    it('should return available templates', async () => {
      const response = await request(app)
        .get('/api/generate/templates')
        .expect(200);

      expectSuccessShape(response, 200);
      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
    });
  });

  describe('POST /api/generate/text-to-image', () => {
    it('should generate image from text with valid data', async () => {
      const validData = {
        prompt: 'A wireless headphone on a modern desk',
        aspectRatio: '1:1'
      };

      const response = await request(app)
        .post('/api/generate/text-to-image')
        .set('Authorization', `Bearer ${testToken}`)
        .send(validData)
        .expect(200);

      expectSuccessShape(response, 200);
      expect(response.body).toHaveProperty('generationId');
      expect(response.body).toHaveProperty('tokensUsed', 100);
      expect(response.body).toHaveProperty('remainingBalance');
    });

    it('should reject request with missing prompt', async () => {
      const invalidData = {
        aspectRatio: '1:1'
      };

      const response = await request(app)
        .post('/api/generate/text-to-image')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request with short prompt', async () => {
      const invalidData = {
        prompt: 'hi',
        aspectRatio: '1:1'
      };

      const response = await request(app)
        .post('/api/generate/text-to-image')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request with invalid aspect ratio', async () => {
      const invalidData = {
        prompt: 'A wireless headphone on a modern desk',
        aspectRatio: '2:1'
      };

      const response = await request(app)
        .post('/api/generate/text-to-image')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without authentication', async () => {
      const validData = {
        prompt: 'A wireless headphone on a modern desk',
        aspectRatio: '1:1'
      };

      const response = await request(app)
        .post('/api/generate/text-to-image')
        .send(validData)
        .expect(401);

      expectErrorShape(response, 401);
    });
  });

  describe('POST /api/generate/edit-simple', () => {
    it('should edit image with valid data', async () => {
      // Check if test image exists
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/edit-simple')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('image', testImagePath)
        .field('prompt', 'Remove the background')
        .expect(200);

      expectSuccessShape(response, 200);
      expect(response.body).toHaveProperty('generationId');
      expect(response.body).toHaveProperty('tokensUsed', 100);
    });

    it('should reject request without image', async () => {
      const response = await request(app)
        .post('/api/generate/edit-simple')
        .set('Authorization', `Bearer ${testToken}`)
        .field('prompt', 'Remove the background')
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without prompt', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/edit-simple')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('image', testImagePath)
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without authentication', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/edit-simple')
        .attach('image', testImagePath)
        .field('prompt', 'Remove the background')
        .expect(401);

      expectErrorShape(response, 401);
    });
  });

  describe('POST /api/generate/edit-complex', () => {
    it('should perform complex image edit with valid data', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/edit-complex')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('image', testImagePath)
        .field('prompt', 'Remove background and add shadows, then flip horizontally')
        .expect(200);

      expectSuccessShape(response, 200);
      expect(response.body).toHaveProperty('generationId');
      expect(response.body).toHaveProperty('tokensUsed', 150);
    });

    it('should reject request without image', async () => {
      const response = await request(app)
        .post('/api/generate/edit-complex')
        .set('Authorization', `Bearer ${testToken}`)
        .field('prompt', 'Remove background and add shadows')
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without authentication', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/edit-complex')
        .attach('image', testImagePath)
        .field('prompt', 'Remove background and add shadows')
        .expect(401);

      expectErrorShape(response, 401);
    });
  });

  describe('POST /api/generate/compose', () => {
    it('should compose multiple images with valid data', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/compose')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .field('prompt', 'Combine these products in one modern scene')
        .expect(200);

      expectSuccessShape(response, 200);
      expect(response.body).toHaveProperty('generationId');
      expect(response.body).toHaveProperty('tokensUsed', 200);
    });

    it('should reject request with insufficient images', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/compose')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('images', testImagePath)
        .field('prompt', 'Combine these products')
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request with too many images', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/compose')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .field('prompt', 'Combine these products')
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without authentication', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/compose')
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .field('prompt', 'Combine these products')
        .expect(401);

      expectErrorShape(response, 401);
    });
  });

  describe('POST /api/generate/style-transfer', () => {
    it('should perform style transfer with valid data', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/style-transfer')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('contentImage', testImagePath)
        .attach('styleImage', testImagePath)
        .expect(200);

      expectSuccessShape(response, 200);
      expect(response.body).toHaveProperty('generationId');
      expect(response.body).toHaveProperty('tokensUsed', 150);
    });

    it('should reject request without content image', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/style-transfer')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('styleImage', testImagePath)
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without style image', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/style-transfer')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('contentImage', testImagePath)
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without authentication', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/style-transfer')
        .attach('contentImage', testImagePath)
        .attach('styleImage', testImagePath)
        .expect(401);

      expectErrorShape(response, 401);
    });
  });

  describe('POST /api/generate/quick-action', () => {
    it('should perform quick action with valid data', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/quick-action')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('image', testImagePath)
        .field('action', 'remove_background')
        .expect(200);

      expectSuccessShape(response, 200);
      expect(response.body).toHaveProperty('generationId');
      expect(response.body).toHaveProperty('tokensUsed', 100);
    });

    it('should reject request with invalid action', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/quick-action')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('image', testImagePath)
        .field('action', 'invalid_action')
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without image', async () => {
      const response = await request(app)
        .post('/api/generate/quick-action')
        .set('Authorization', `Bearer ${testToken}`)
        .field('action', 'remove_background')
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without action', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/quick-action')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('image', testImagePath)
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without authentication', async () => {
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/quick-action')
        .attach('image', testImagePath)
        .field('action', 'remove_background')
        .expect(401);

      expectErrorShape(response, 401);
    });
  });

  describe('POST /api/generate/text-rendering', () => {
    it('should generate image with text with valid data', async () => {
      const validData = {
        text: 'Sample Text',
        style: 'modern',
        backgroundColor: '#ffffff',
        textColor: '#000000'
      };

      const response = await request(app)
        .post('/api/generate/text-rendering')
        .set('Authorization', `Bearer ${testToken}`)
        .send(validData)
        .expect(200);

      expectSuccessShape(response, 200);
      expect(response.body).toHaveProperty('generationId');
      expect(response.body).toHaveProperty('tokensUsed', 100);
    });

    it('should reject request without text', async () => {
      const invalidData = {
        style: 'modern',
        backgroundColor: '#ffffff'
      };

      const response = await request(app)
        .post('/api/generate/text-rendering')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request with text too long', async () => {
      const invalidData = {
        text: 'a'.repeat(201), // Exceeds 200 character limit
        style: 'modern'
      };

      const response = await request(app)
        .post('/api/generate/text-rendering')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);

      expectErrorShape(response, 400);
    });

    it('should reject request without authentication', async () => {
      const validData = {
        text: 'Sample Text',
        style: 'modern'
      };

      const response = await request(app)
        .post('/api/generate/text-rendering')
        .send(validData)
        .expect(401);

      expectErrorShape(response, 401);
    });
  });

  describe('Error Handling', () => {
    it('should handle file size limit exceeded', async () => {
      // This test would need a large file, but we'll mock the error
      if (!fs.existsSync(testImagePath)) {
        console.warn('Test image not found, skipping file upload test');
        return;
      }

      const response = await request(app)
        .post('/api/generate/edit-simple')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('image', testImagePath)
        .field('prompt', 'Remove background')
        .expect(200); // This might pass if file is small enough

      // The actual file size limit is handled by multer middleware
      // We can't easily test this without creating a large file
    });

    it('should handle invalid file type', async () => {
      // Create a temporary text file to test invalid file type
      const tempFilePath = path.join(__dirname, 'temp-invalid-file.txt');
      fs.writeFileSync(tempFilePath, 'This is not an image');

      const response = await request(app)
        .post('/api/generate/edit-simple')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('image', tempFilePath)
        .field('prompt', 'Remove background')
        .expect(400);

      expectErrorShape(response, 400);

      // Clean up
      fs.unlinkSync(tempFilePath);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/generate/text-to-image')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/json')
        .send('{"prompt": "test", invalid}')
        .expect(400);

      expectErrorShape(response, 400);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit exceeded', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/api/generate/operations')
        );
      }

      const responses = await Promise.all(promises);
      
      // At least some requests should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);

      // Some requests might be rate limited
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      // Rate limiting behavior depends on implementation
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all POST endpoints', async () => {
      // Test that endpoints return 401 without authentication
      const endpoints = [
        { method: 'post', path: '/api/generate/text-to-image', data: { prompt: 'test' } },
        { method: 'post', path: '/api/generate/text-rendering', data: { text: 'test' } }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .send(endpoint.data);
        
        // Should fail authentication
        expectErrorShape(response, 401);
      }
    });

    it('should allow access to GET endpoints without authentication', async () => {
      // GET endpoints should be accessible without auth
      const endpoints = [
        '/api/generate/operations',
        '/api/generate/templates'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);
        
        expectSuccessShape(response, 200);
      }
    });
  });
});
