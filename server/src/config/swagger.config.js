import swaggerJsdoc from "swagger-jsdoc";
import { config } from "./env.js";
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Tasty Banana v2 API",
    version: "1.0.0",
    description:
      "API documentation for Tasty Banana v2 - Token Management & AI Image Generation",
    contact: {
      name: "API Support",
    },
  },
  servers: [
    {
      url: `/api`,
      description: `${config.nodeEnv} server`,
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          status: {
            type: "integer",
            example: 400,
          },
          message: {
            type: "string",
            example: "Error message",
          },
          code: {
            type: "string",
            example: "ERROR_CODE",
          },
        },
      },
      Success: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          status: {
            type: "integer",
            example: 200,
          },
          message: {
            type: "string",
            example: "Success message",
          },
          data: {
            type: "object",
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
