# Auth API

This document provides instructions for calling the authentication-related API endpoints.

---

## User Login

- **METHOD**: `POST`
- **PATH**: `/api/auth/login`
- **Description**: Authenticates a user and returns an access token.
- **Auth requirement**: Public
- **Headers**:
  - `Content-Type`: `application/json`
- **Request body**:

```json
{
  "email": "user@example.com",
  "password": "Password@123!"
}
```

- **Success response sample**:

```json
{
  "success": true,
  "status": 200,
  "message": "Login successful",
  "user": {
    "id": "clxsehf0a000008l366p1g2g2",
    "username": "testuser",
    "email": "user@example.com",
    "role": "user",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- **Error responses**:

  - **400 Bad Request**: Invalid credentials or validation error.
  - **401 Unauthorized**: Incorrect password.

- **How to call (pseudo)**:

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password@123!"
}
```

---

## Register New User

- **METHOD**: `POST`
- **PATH**: `/api/auth/register`
- **Description**: Registers a new user in the system.
- **Auth requirement**: Public
- **Headers**:
  - `Content-Type`: `application/json`
- **Request body**:

```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "Password@123",
  "confirmPassword": "Password@123"
}
```

- **Success response sample**:

```json
{
  "success": true,
  "status": 200,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "clxsehf0a000208l3h3q7b6g4",
      "username": "newuser",
      "email": "newuser@example.com",
      "role": "user",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokensGranted": 1000
  }
}
```

- **Error responses**:

  - **400 Bad Request**: Validation error (e.g., email already exists, passwords do not match, or password does not meet complexity requirements).

- **How to call (pseudo)**:

```
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "Password@123",
  "confirmPassword": "Password@123"
}
```

---

## Request Password Reset

- **METHOD**: `POST`
- **PATH**: `/api/auth/reset-password`
- **Description**: Sends a password reset link to the user's email.
- **Auth requirement**: Public
- **Headers**:
  - `Content-Type`: `application/json`
- **Request body**:

```json
{
  "email": "user@example.com"
}
```

- **Success response sample**:

```json
{
  "success": true,
  "status": 200,
  "message": "Reset password successfully. Check your mailbox for new password"
}
```

- **Error responses**:

  - **400 Bad Request**: Invalid email format or user not found.

- **How to call (pseudo)**:

```
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

---

## Change User Password

- **METHOD**: `PUT`
- **PATH**: `/api/auth/change-password`
- **Description**: Allows an authenticated user to change their password.
- **Auth requirement**: Needs Bearer token
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <access_token>`
- **Request body**:

```json
{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

- **Success response sample**:

```json
{
  "success": true,
  "status": 200,
  "message": "Update password successfully"
}
```

- **Error responses**:

  - **400 Bad Request**: Validation error (e.g., new passwords do not match, or new password does not meet complexity requirements).
  - **401 Unauthorized**: Invalid or expired token, or incorrect current password.

- **How to call (pseudo)**:

```
PUT /api/auth/change-password
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```
