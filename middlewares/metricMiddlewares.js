const client = require("prom-client");
const { sequelize, User } = require("../models");

// 인스턴스 식별자 설정 (환경 변수 또는 구성 파일에서 가져올 수 있음)
const instanceId = process.env.INSTANCE_ID || "instance-0";

const sequelizeConnectionTotal = new client.Gauge({
  name: "sequelize_connection_total",
  help: "Total number of connections in the pool",
});

const sequelizeConnectionAcquired = new client.Gauge({
  name: "sequelize_connection_acquired",
  help: "Number of connections acquired from the pool",
  labelNames: ["instance"], // 인스턴스 레이블 추가
});

const sequelizeConnectionReleased = new client.Gauge({
  name: "sequelize_connection_released",
  help: "Number of connections released back to the pool",
});

const activeConnectionsGauge = new client.Gauge({
  name: "mysql_active_connections",
  help: "Number of active MySQL connections",
});

const concurrentConnectionsGauge = new client.Gauge({
  name: "mysql_concurrent_connections",
  help: "Number of concurrent MySQL connections",
});

let acquiredConnections = 0;
let releasedConnections = 0;
let concurrentConnections = 0;

sequelize.addHook("afterConnect", (connection) => {
  acquiredConnections++;
  sequelizeConnectionTotal.set(sequelize.connectionManager.pool.size);
  sequelizeConnectionAcquired.labels(instanceId).set(acquiredConnections);
  activeConnectionsGauge.set(sequelize.connectionManager.pool.size);
  concurrentConnectionsGauge.set(concurrentConnections);
  concurrentConnections++;
});

sequelize.addHook("beforeDisconnect", (connection) => {
  releasedConnections++;
  sequelizeConnectionTotal.set(sequelize.connectionManager.pool.size);
  sequelizeConnectionReleased.set(releasedConnections);
  concurrentConnections--;
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status_code", "container_name"],
  buckets: [0.1, 0.3, 0.5, 1, 3, 5],
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status_code", "container_name"],
});

module.exports = (containerName) => {
  return (req, res, next) => {
    const end = httpRequestDuration
      .labels(req.method, req.path, res.statusCode, containerName)
      .startTimer();

    res.on("finish", () => {
      end();
      httpRequestsTotal
        .labels(req.method, req.path, res.statusCode, containerName)
        .inc();
    });

    next();
  };
};
