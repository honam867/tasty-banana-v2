# Prompt Features Implementation Guide

This document outlines the implementation flow for managing Prompt Templates, Style Libraries, and Hints in the admin dashboard.

## Overview & Entity Relationships

The core of this feature set is the **Prompt Template**. A Prompt Template is a reusable piece of text that can be used to generate images.

-   **Style Libraries:** A Style Library is a curated collection of Prompt Templates, grouped under a specific style (e.g., "Fun", "Realistic", "Sci-Fi").
-   **Hints:** A Hint provides suggestions to the user and can also be associated with a collection of Prompt Templates to guide the user's creativity.

Because both Style Libraries and Hints depend on Prompt Templates, the UI implementation should follow a specific order.

## UI Implementation Flow

Here is the recommended implementation order for the front-end UI:

### Step 1: Manage Prompt Templates

This is the foundational step. The user must be able to create, view, update, and delete Prompt Templates before they can be used in Style Libraries or Hints.

**UI Checklist:**

-   [ ] A view to list all existing Prompt Templates with search and filter capabilities.
-   [ ] A form to create a new Prompt Template (`name`, `prompt`, `previewUrl`).
-   [ ] A view to see the details of a single Prompt Template.
-   [ ] A form to edit an existing Prompt Template.
-   [ ] A way to delete a Prompt Template.
-   [ ] A button to toggle the `isActive` status of a template.

**Key API Endpoints:**

-   `GET /api/prompt-templates`: Get all templates.
-   `POST /api/prompt-templates`: Create a new template.
-   `GET /api/prompt-templates/:id`: Get a single template.
-   `PUT /api/prompt-templates/:id`: Update a template.
-   `DELETE /api/prompt-templates/:id`: Delete a template.
-   `PATCH /api/prompt-templates/:id/toggle`: Toggle active status.

### Step 2: Manage Style Libraries

Once Prompt Templates can be managed, the user can create Style Libraries and associate templates with them.

**UI Checklist:**

-   [ ] A view to list all existing Style Libraries.
-   [ ] A form to create a new Style Library (`name`, `description`).
-   [ ] A view to see the details of a single Style Library. This view should also list the associated Prompt Templates.
-   [ ] A mechanism (e.g., a multi-select dropdown, a checklist) in the Style Library detail/edit view to add or remove existing Prompt Templates from the library.
-   [ ] A way to delete a Style Library.
-   [ ] A button to toggle the `isActive` status of a style.

**Key API Endpoints:**

-   `GET /api/style-library`: Get all styles.
-   `POST /api/style-library`: Create a new style.
-   `GET /api/style-library/:id`: Get a single style.
-   `PUT /api/style-library/:id`: Update a style.
-   `DELETE /api/style-library/:id`: Delete a style.
-   `POST /api/style-library/:id/templates`: Add a template to a style.
-   `DELETE /api/style-library/:id/templates/:templateId`: Remove a template from a style.
-   `PATCH /api/style-library/:id/toggle`: Toggle active status.

### Step 3: Manage Hints

Similar to Style Libraries, Hints are also created and then associated with Prompt Templates.

**UI Checklist:**

-   [ ] A view to list all existing Hints.
-   [ ] A form to create a new Hint (`name`, `type`, `description`).
-   [ ] A view to see the details of a single Hint. This view should also list the associated Prompt Templates.
-   [ ] A mechanism in the Hint detail/edit view to add or remove existing Prompt Templates from the hint.
-   [ ] A way to delete a Hint.
-   [ ] A button to toggle the `isActive` status of a hint.

**Key API Endpoints:**

-   `GET /api/hints`: Get all hints.
-   `POST /api/hints`: Create a new hint.
-   `GET /api/hints/:id`: Get a single hint.
-   `PUT /api/hints/:id`: Update a hint.
-   `DELETE /api/hints/:id`: Delete a hint.
-   `POST /api/hints/:id/templates`: Add a template to a hint.
-   `DELETE /api/hints/:id/templates/:templateId`: Remove a template from a hint.
-   `PATCH /api/hints/:id/toggle`: Toggle active status.
