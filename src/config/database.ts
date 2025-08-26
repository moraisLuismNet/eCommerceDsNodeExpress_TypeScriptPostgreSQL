import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Database configuration
const dbConfig = {
  database: process.env.DB_NAME || "eCommerceDs",
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "root",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  dialect: "postgres" as const,
  logging: process.env.NODE_ENV !== "production" ? console.log : false,
  define: {
    timestamps: false, // Disable timestamps globally
    freezeTableName: true,
    underscored: false,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    define: dbConfig.define,
    pool: dbConfig.pool,
  }
);

export { sequelize };
