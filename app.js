const express = require("express");
const app = express();
const client = require("prom-client");
const collectDefaultMetrics = client.collectDefaultMetrics;

// 프로메테우스 기본 메트릭 수집
collectDefaultMetrics({ timeout: 5000 });

// HTTP 요청 메트릭 정의
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status_code"],
  buckets: [0.1, 0.3, 0.5, 1, 3, 5],
});

// 미들웨어로 메트릭 수집
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({ method: req.method, path: req.path, status_code: res.statusCode });
  });
  next();
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

// ... 애플리케이션 코드
app.listen(3001, () => console.log("Listening on port 3001"));
