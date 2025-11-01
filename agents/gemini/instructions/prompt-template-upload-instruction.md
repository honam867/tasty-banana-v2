# Frontend Instruction: Updating Prompt Template Previews

## Goal

This document outlines the new workflow for handling the `previewUrl` field when creating or updating prompt templates. Instead of providing a direct URL string, you will now use the file upload endpoint to get a URL.

## Current vs. New Workflow

**Old Workflow:**
You were sending a JSON payload with a string for `previewUrl`:
```json
{
  "name": "My Template",
  "prompt": "A cool prompt",
  "previewUrl": "http://example.com/image.png" // This is now incorrect
}
```

**New Workflow:**
1.  Upload the image using the `/api/uploads` endpoint.
2.  Get the `publicUrl` from the response.
3.  Use that `publicUrl` in your `create` or `update` payload for the prompt template.

## Step-by-Step Guide

### Step 1: Upload the Preview Image

Make a `POST` request to `/api/uploads`. This must be a `multipart/form-data` request.

- **Endpoint:** `POST /api/uploads`
- **Auth:** `bearer` (requires Authorization header)
- **Body:** `multipart/form-data`
  - The file should be in a field named `file`.

**Example Request (using fetch):**
```javascript
const fileInput = document.querySelector('input[type="file"]');
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/uploads', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${your_auth_token}`
  },
  body: formData
});

const uploadResult = await response.json();
// Expected success response: { success: true, data: { publicUrl: '...' } }
```

### Step 2: Extract the `publicUrl`

The response from the upload endpoint will contain the URL of the stored image. You need to extract the `publicUrl` from the `data` object in the response.

**Example Success Response from `/api/uploads`:**
```json
{
  "success": true,
  "data": {
    "id": "upload-uuid",
    "publicUrl": "https://your-r2-bucket.s3.amazonaws.com/path/to/your/image.png",
    // ... other fields
  }
}
```

### Step 3: Create or Update the Prompt Template

Use the `publicUrl` you received in Step 2 as the value for the `previewUrl` field when you create or update a prompt template.

**Example `create` Request (`POST /api/prompt-templates`):**
```json
{
  "name": "My New Template",
  "prompt": "Another cool prompt",
  "previewUrl": "https://your-r2-bucket.s3.amazonaws.com/path/to/your/image.png" // Use the URL from the upload response
}
```

**Example `update` Request (`PUT /api/prompt-templates/:id`):**
```json
{
  "previewUrl": "https://your-r2-bucket.s3.amazonaws.com/path/to/your/new-image.png" // Use the URL from a new upload
}
```

## Summary

To associate a preview image with a prompt template, you must first upload the image to get a URL. This ensures all images are stored correctly in our system. The `previewUrl` field now acts as a pointer to a file managed by our backend.
