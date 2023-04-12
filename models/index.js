// models/index.js
const { Sequelize } = require("sequelize");
const UserModel = require("./user");
const OrderModel = require("./order");
const logger = require("../logger");
require("dotenv").config();

const env = process.env.NODE_ENV || "development";
const isProduction = env === "production";
const isLocal = env === "local";
const isDevelopment = env === "development";

const config = {
  production: {
    dialect: process.env.DB_DIALECT,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    pool: {
      max: 300,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: true,
  },
  development: {
    dialect: process.env.DB_DIALECT,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    pool: {
      max: 300,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: true,
  },
  local: {
    dialect: "sqlite",
    storage: "db_local.sqlite",
    logging: true,
  },
};

const dbConfig = config[env];

const sequelize = new Sequelize(
  process.env.DB_DATABASE || "sqlite::memory:",
  process.env.DB_USERNAME || "",
  process.env.DB_PASSWORD || "",
  dbConfig
);

logger.info(process.env);
logger.info(dbConfig);

const User = UserModel(sequelize);
const Order = OrderModel(sequelize);

module.exports = {
  sequelize,
  User,
  Order,
};
