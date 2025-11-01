# Operations Implementation Spec

_Based on:_ `agents/gemini/instructions/extract-api.md`
_Generated:_ 2025-11-01 09:00 UTC

## Route: GET /api/operations

- **Description:** List available image generation operations with their token costs.
- **Auth:** public
- **Headers:**
  - Content-Type: application/json

### Query Params
- None

### Request Body (JSON)
- None

### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-string-1",
      "name": "image_generation",
      "tokensPerOperation": 100,
      "description": "Generate an image from a text prompt.",
      "isActive": true,
      "createdAt": "2025-11-01T09:00:00.000Z",
      "updatedAt": "2025-11-01T09:00:00.000Z"
    },
    {
      "id": "uuid-string-2",
      "name": "image_upscale",
      "tokensPerOperation": 200,
      "description": "Upscale image resolution using AI.",
      "isActive": true,
      "createdAt": "2025-11-01T09:00:00.000Z",
      "updatedAt": "2025-11-01T09:00:00.000Z"
    }
  ]
}
```

### Error Responses
- **500 Internal Server Error**
  ```json
  {
    "success": false,
    "error": "INTERNAL_SERVER_ERROR",
    "details": "An unexpected error occurred."
  }
  ```
---
## Route: GET /api/operations/:id
- **Description:** Get a single operation by its ID.
- **Auth:** public
- **Headers:**
  - Content-Type: application/json

### Path Params
- `id` (string, required) - The UUID of the operation.

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid-string-1",
    "name": "image_generation",
    "tokensPerOperation": 100,
    "description": "Generate an image from a text prompt.",
    "isActive": true,
    "createdAt": "2025-11-01T09:00:00.000Z",
    "updatedAt": "2025-11-01T09:00:00.000Z"
  }
}
```

### Error Responses
- **404 Not Found**
  ```json
  {
    "success": false,
    "error": "NOT_FOUND",
    "details": "Operation not found."
  }
  ```
---
## Route: POST /api/operations
- **Description:** Create a new operation. (Admin only)
- **Auth:** bearer, role:admin
- **Headers:**
  - Authorization: Bearer {{access_token}}
  - Content-Type: application/json

### Request Body (JSON)
```json
{
  "name": "image_variation",
  "tokensPerOperation": 150,
  "description": "Create a variation of a given image.",
  "isActive": true
}
```

### Success Response (201)
```json
{
  "success": true,
  "data": {
    "id": "new-uuid-string",
    "name": "image_variation",
    "tokensPerOperation": 150,
    "description": "Create a variation of a given image.",
    "isActive": true,
    "createdAt": "2025-11-01T09:00:00.000Z",
    "updatedAt": "2025-11-01T09:00:00.000Z"
  }
}
```

### Error Responses
- **400 Bad Request**
  ```json
  {
    "success": false,
    "error": "VALIDATION_ERROR",
    "details": {
      "name": "Operation name is required"
    }
  }
  ```
- **401 Unauthorized**
  ```json
  {
    "success": false,
    "error": "UNAUTHORIZED"
  }
  ```
- **409 Conflict**
  ```json
  {
    "success": false,
    "error": "CONFLICT",
    "details": "Operation with this name already exists."
  }
  ```
---
## Route: PUT /api/operations/:id
- **Description:** Update an existing operation. (Admin only)
- **Auth:** bearer, role:admin
- **Headers:**
  - Authorization: Bearer {{access_token}}
  - Content-Type: application/json

### Path Params
- `id` (string, required) - The UUID of the operation to update.

### Request Body (JSON)
```json
{
  "tokensPerOperation": 175,
  "isActive": false
}
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid-string-to-update",
    "name": "image_variation",
    "tokensPerOperation": 175,
    "description": "Create a variation of a given image.",
    "isActive": false,
    "createdAt": "2025-11-01T09:00:00.000Z",
    "updatedAt": "2025-11-01T09:05:00.000Z"
  }
}
```

### Error Responses
- **401 Unauthorized**
  ```json
  {
    "success": false,
    "error": "UNAUTHORIZED"
  }
  ```
- **404 Not Found**
  ```json
  {
    "success": false,
    "error": "NOT_FOUND",
    "details": "Operation not found."
  }
  ```
---
## Route: DELETE /api/operations/:id
- **Description:** Delete an operation. (Admin only)
- **Auth:** bearer, role:admin
- **Headers:**
  - Authorization: Bearer {{access_token}}

### Path Params
- `id` (string, required) - The UUID of the operation to delete.

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid-string-to-delete"
  }
}
```

### Error Responses
- **401 Unauthorized**
  ```json
  {
    "success": false,
    "error": "UNAUTHORIZED"
  }
  ```
- **404 Not Found**
  ```json
  {
    "success": false,
    "error": "NOT_FOUND",
    "details": "Operation not found."
  }
  ```
