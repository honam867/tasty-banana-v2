# Prompt Features API Specification

This document provides a detailed specification for the APIs related to Prompt Templates, Style Libraries, and Hints.

---

## Prompt Templates

### List Prompt Templates

- **METHOD**: `GET`
- **PATH**: `/api/prompt-templates`
- **Description**: Retrieves a list of all prompt templates.
- **Auth requirement**: Public
- **Headers**:
  - `Content-Type`: `application/json`
- **Query params**:
  - `isActive` (boolean, optional): Filter by active status.
  - `search` (string, optional): Search by name.
- **Request body**: None
- **Success response sample**:

```json
{
  "success": true,
  "status": 200,
  "message": "Prompt templates retrieved successfully",
  "data": [
    {
      "id": "clxsehf0a000008l366p1g2g2",
      "name": "Cinematic Portrait",
      "prompt": "A cinematic portrait of a character, dramatic lighting, high detail, 8k",
      "previewUrl": "https://example.com/preview.jpg",
      "isActive": true,
      "createdAt": "2025-11-01T10:00:00.000Z",
      "updatedAt": "2025-11-01T10:00:00.000Z"
    }
  ]
}
```

- **Error responses**:
  - **500 Internal Server Error**: If there is a server-side error.

- **How to call (pseudo)**:

```
GET /api/prompt-templates?isActive=true
Content-Type: application/json
```

### Create Prompt Template

- **METHOD**: `POST`
- **PATH**: `/api/prompt-templates`
- **Description**: Creates a new prompt template.
- **Auth requirement**: Needs Bearer token
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <access_token>`
- **Request body**:

```json
{
  "name": "Vintage Photography",
  "prompt": "A vintage photograph, grainy, sepia tones, 1940s era.",
  "previewUrl": "https://example.com/vintage.jpg",
  "isActive": true
}
```

- **Success response sample**:

```json
{
  "success": true,
  "status": 201,
  "message": "Prompt template created successfully",
  "data": {
    "id": "clxsehf0a000108l3h3q7b6g3",
    "name": "Vintage Photography",
    "prompt": "A vintage photograph, grainy, sepia tones, 1940s era.",
    "previewUrl": "https://example.com/vintage.jpg",
    "isActive": true,
    "createdAt": "2025-11-01T11:00:00.000Z",
    "updatedAt": "2025-11-01T11:00:00.000Z"
  }
}
```

- **Error responses**:
  - **400 Bad Request**: If required fields are missing.
  - **401 Unauthorized**: If the user is not authenticated.
  - **500 Internal Server Error**: If there is a server-side error.

- **How to call (pseudo)**:

```
POST /api/prompt-templates
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "name": "Vintage Photography",
  "prompt": "A vintage photograph, grainy, sepia tones, 1940s era.",
  "previewUrl": "https://example.com/vintage.jpg"
}
```

---

## Style Libraries

### List Style Libraries

- **METHOD**: `GET`
- **PATH**: `/api/style-library`
- **Description**: Retrieves a list of all style libraries.
- **Auth requirement**: Public
- **Headers**:
  - `Content-Type`: `application/json`
- **Query params**:
  - `isActive` (boolean, optional): Filter by active status.
  - `search` (string, optional): Search by name.
- **Request body**: None
- **Success response sample**:

```json
{
  "success": true,
  "status": 200,
  "message": "Style libraries retrieved successfully",
  "data": [
    {
      "id": "clxsehf0a000208l3h3q7b6g4",
      "name": "Cinematic Styles",
      "description": "A collection of styles for creating cinematic images.",
      "promptTemplateIds": ["clxsehf0a000008l366p1g2g2"],
      "isActive": true,
      "createdAt": "2025-11-01T12:00:00.000Z",
      "updatedAt": "2025-11-01T12:00:00.000Z"
    }
  ]
}
```

- **How to call (pseudo)**:

```
GET /api/style-library
Content-Type: application/json
```

### Add Template to Style Library

- **METHOD**: `POST`
- **PATH**: `/api/style-library/:id/templates`
- **Description**: Adds a prompt template to a style library.
- **Auth requirement**: Needs Bearer token
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <access_token>`
- **Path params**:
  - `id` (string, required): The ID of the style library.
- **Request body**:

```json
{
  "templateId": "clxsehf0a000108l3h3q7b6g3"
}
```

- **Success response sample**:

```json
{
  "success": true,
  "status": 200,
  "message": "Template added to style successfully",
  "data": {
    "id": "clxsehf0a000208l3h3q7b6g4",
    "name": "Cinematic Styles",
    "description": "A collection of styles for creating cinematic images.",
    "promptTemplateIds": ["clxsehf0a000008l366p1g2g2", "clxsehf0a000108l3h3q7b6g3"],
    "isActive": true,
    "createdAt": "2025-11-01T12:00:00.000Z",
    "updatedAt": "2025-11-01T13:00:00.000Z"
  }
}
```

- **How to call (pseudo)**:

```
POST /api/style-library/clxsehf0a000208l3h3q7b6g4/templates
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "templateId": "clxsehf0a000108l3h3q7b6g3"
}
```

---

## Hints

### List Hints

- **METHOD**: `GET`
- **PATH**: `/api/hints`
- **Description**: Retrieves a list of all hints.
- **Auth requirement**: Public
- **Headers**:
  - `Content-Type`: `application/json`
- **Query params**:
  - `isActive` (boolean, optional): Filter by active status.
  - `type` (string, optional): Filter by hint type.
  - `search` (string, optional): Search by name.
- **Request body**: None
- **Success response sample**:

```json
{
  "success": true,
  "status": 200,
  "message": "Hints retrieved successfully",
  "data": [
    {
      "id": "clxsehf0a000308l3h3q7b6g5",
      "name": "Character Actions",
      "type": "action",
      "description": "Actions a character can perform.",
      "promptTemplateIds": [],
      "isActive": true,
      "createdAt": "2025-11-01T14:00:00.000Z",
      "updatedAt": "2025-11-01T14:00:00.000Z"
    }
  ]
}
```

- **How to call (pseudo)**:

```
GET /api/hints?type=action
Content-Type: application/json
```

### Add Template to Hint

- **METHOD**: `POST`
- **PATH**: `/api/hints/:id/templates`
- **Description**: Adds a prompt template to a hint.
- **Auth requirement**: Needs Bearer token
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <access_token>`
- **Path params**:
  - `id` (string, required): The ID of the hint.
- **Request body**:

```json
{
  "templateId": "clxsehf0a000008l366p1g2g2"
}
```

- **Success response sample**:

```json
{
  "success": true,
  "status": 200,
  "message": "Template added to hint successfully",
  "data": {
    "id": "clxsehf0a000308l3h3q7b6g5",
    "name": "Character Actions",
    "type": "action",
    "description": "Actions a character can perform.",
    "promptTemplateIds": ["clxsehf0a000008l366p1g2g2"],
    "isActive": true,
    "createdAt": "2025-11-01T14:00:00.000Z",
    "updatedAt": "2025-11-01T15:00:00.000Z"
  }
}
```

- **How to call (pseudo)**:

```
POST /api/hints/clxsehf0a000308l3h3q7b6g5/templates
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "templateId": "clxsehf0a000008l366p1g2g2"
}
```
