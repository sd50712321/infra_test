const express = require("express");
const app = express();
const client = require("prom-client");
const collectDefaultMetrics = client.collectDefaultMetrics;
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const logger = require("./logger");

// 로그 디렉터리 생성
const logDirectory = path.join(__dirname, "logs");
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// 프로메테우스 기본 메트릭 수집
collectDefaultMetrics({ timeout: 5000 });

// HTTP 요청 메트릭 정의
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status_code"],
  buckets: [0.1, 0.3, 0.5, 1, 3, 5],
});

app.use((req, res, next) => {
  if (req.url === "/metrics") {
    return next();
  }
  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    let logLevel = "info";

    if (res.statusCode >= 400 && res.statusCode < 500) {
      logLevel = "warn";
    } else if (res.statusCode >= 500) {
      logLevel = "error";
    }

    logger.log(
      logLevel,
      `${req.method} ${req.url} ${res.statusCode} - ${duration} ms`,
      {
        method: req.method,
        url: req.url,
        status: res.statusCode,
      }
    );
  });
  next();
});

// 미들웨어로 메트릭 수집
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({ method: req.method, path: req.path, status_code: res.statusCode });
  });
  next();
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  logger.error({ message: err.message, status: 500 });
  res.status(500).send("예상하지 못한 에러 발생");
});

// 프로메테우스 메트릭 엔드포인트
app.get("/metrics", (req, res) => {
  res.set("Content-Type", client.register.contentType);
  client.register
    .metrics()
    .then((metrics) => {
      res.end(metrics);
    })
    .catch((err) => {
      res.status(500).end(err);
    });
});

app.get("/err-test", (req, res) => {
  try {
    const data = {
      time: 1234,
      name: "hi",
    };
    const data2 = {
      time: 12345,
      name: "hi",
    };
    logger.verbose("일반에러 발생 페이지 진입");
    logger.verbose("일반 객체 출력확인 data =", data, data2);
    logger.warn("경고");
    throw new Error("일반 에러 발생");
  } catch (err) {
    logger.error({ message: err.message, status: 500 });
    logger.error({
      message: err.message,
      data: { test: "1234", message: "test" },
      status: 500,
    });
    res.status(500).send(err.message);
  }
});

// ... 애플리케이션 코드
app.listen(3001, () => {
  console.log("Listening on port 3001");
  logger.info("Listening on port 3001");
});
