import swaggerJsdoc from "swagger-jsdoc";
const { version } = require("../../package.json");

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "eCommerceDsNodeExpressTypeScriptPostgreSQL API",
      version,
      description: "API documentation for the eCommerceDsNodeExpressTypeScriptPostgreSQL application",
      contact: {
        name: "API Support",
        email: "morais.luism.net@gmail.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [],
  },
  apis: [
    "./src/routes/*.ts", 
  ],
};

const specs = swaggerJsdoc(options);

export default specs;
