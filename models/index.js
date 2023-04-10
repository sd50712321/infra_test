// models/index.js
const { Sequelize } = require("sequelize");
const UserModel = require("./user");
const OrderModel = require("./order");
const logger = require("../logger");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const dbConfig = {
  dialect: isProduction ? process.env.DB_DIALECT : "sqlite",
  host: isProduction ? process.env.DB_HOST : "",
  port: isProduction ? process.env.DB_PORT : "",
  pool: {
    max: 300, // 최대 커넥션 수
    min: 0, // 최소 커넥션 수
    acquire: 30000, // 커넥션 획득 시간
    idle: 10000, // 커넥션이 유휴 상태로 있을 시간
  },
  logging: true,
};

const sequelize = new Sequelize(
  isProduction ? process.env.DB_DATABASE : "sqlite::memory:",
  isProduction ? process.env.DB_USERNAME : "",
  isProduction ? process.env.DB_PASSWORD : "",
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
