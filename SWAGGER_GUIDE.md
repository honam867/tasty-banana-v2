# Swagger API Documentation Guide

## Quick Start

Swagger UI has been successfully set up in your project for easy API testing.

### Access Swagger UI

1. Start the development server:
   ```bash
   cd server
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8090/api-docs
   ```

## Features

### Available API Documentation

Swagger UI provides interactive documentation for all your API endpoints organized by tags:

- **Auth** - Authentication endpoints (login, register, password reset)
- **Tokens** - Token management (balance, history, admin top-up)
- **Gemini AI** - Image generation endpoints (7 different operations)
- **Uploads** - File upload to R2 storage
- **Queue** - Job queue monitoring and management

### Testing Endpoints

#### 1. Public Endpoints (No Authentication)
Test these endpoints directly:
- `GET /api/generate/operations` - List available operations
- `GET /api/generate/templates` - List prompt templates
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

#### 2. Protected Endpoints (Require Authentication)

**Step 1:** Authenticate
1. Click on `POST /api/auth/login` endpoint
2. Click "Try it out"
3. Enter your credentials:
   ```json
   {
     "email": "your-email@example.com",
     "password": "YourPassword@123"
   }
   ```
4. Click "Execute"
5. Copy the token from the response

**Step 2:** Authorize Swagger
1. Click the **"Authorize"** button at the top right
2. Enter: `Bearer YOUR_TOKEN_HERE`
3. Click "Authorize" then "Close"

**Step 3:** Test Protected Endpoints
Now you can test all protected endpoints like:
- `GET /api/tokens/balance`
- `GET /api/tokens/history`
- `POST /api/generate/text-to-image`
- `POST /api/uploads`

### Testing File Uploads

For endpoints that require file uploads (multipart/form-data):

1. Click "Try it out" on the endpoint
2. Click "Choose File" button to select your image
3. Fill in other required fields
4. Click "Execute"

**File Upload Endpoints:**
- `POST /api/uploads` - General file upload
- `POST /api/generate/edit-simple` - Simple image editing
- `POST /api/generate/edit-complex` - Complex image editing
- `POST /api/generate/compose` - Multi-image composition
- `POST /api/generate/style-transfer` - Style transfer
- `POST /api/generate/quick-action` - Quick image actions

## Swagger Configuration

The Swagger setup uses:
- **swagger-jsdoc** - Generates OpenAPI spec from JSDoc comments
- **swagger-ui-express** - Provides the Swagger UI interface

Configuration file: `server/src/config/swagger.config.js`

## Customization

To modify the Swagger configuration:

1. Edit `server/src/config/swagger.config.js`
2. Update API info, servers, or security schemes
3. Restart the development server

## Adding New Endpoints

When you add new routes, document them with JSDoc comments:

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     summary: Endpoint description
 *     tags: [Your Tag]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field1:
 *                 type: string
 *                 example: value1
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/your-endpoint', yourController);
```

## Tips

1. **Use the "Authorize" button** instead of manually adding tokens to each request
2. **Check response schemas** to understand the data structure
3. **Test error cases** by providing invalid data
4. **Copy curl commands** - Click on each request to get the curl command
5. **Download OpenAPI spec** - Available at the top of the Swagger UI page

## Troubleshooting

### Swagger UI not loading
- Check if server is running on port 8090
- Clear browser cache
- Check console for JavaScript errors

### Endpoints not appearing
- Ensure JSDoc comments are properly formatted
- Check that route files are imported in `routes/index.js`
- Restart the development server

### Authentication not working
- Make sure to include "Bearer " prefix before the token
- Check token expiration
- Verify token is valid by checking `/api/tokens/balance`

## Security Notes

- Swagger UI is enabled in development mode
- Consider disabling or protecting Swagger UI in production
- Never commit real authentication tokens
- Use test accounts for Swagger testing

## Next Steps

1. ✅ Swagger is set up and ready to use
2. Test all your endpoints through Swagger UI
3. Share the Swagger URL with your team
4. Use it for API development and debugging

Happy testing! 🚀
