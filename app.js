const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const logger = require("./logger");
const { sequelize, User, Order } = require("./models");
const metricsMiddleware = require("./middlewares/metricMiddlewares");
const getMetrics = require("./middlewares/metricPm2Middlewares");
const responseLoggingMiddleware = require("./middlewares/responseLoggingMiddleware");
const client = require("prom-client");
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });
const { execSync } = require("child_process");

let containerName = "";
const isDocker = fs.existsSync("/proc/self/cgroup");

if (isDocker) {
  try {
    containerName = execSync(
      "cat /proc/self/cgroup | grep 'docker' | sed 's/^.*\\///' | tail -n1"
    )
      .toString()
      .trim();
  } catch (error) {
    logger.error("Could not get container name:", error);
  }
}
// try {
//   containerName = execSync(
//     "cat /proc/self/cgroup | grep 'docker' | sed 's/^.*\\///' | tail -n1"
//   )
//     .toString()
//     .trim();
// } catch (error) {
//   logger.error("Could not get container name:", error);
// }

(async () => {
  await sequelize.sync();
  // 여기에 초기 데이터를 삽입하거나 기존 데이터베이스와 동기화합니다.
  for (let i = 0; i < 10; i++) {
    await User.create({
      name: `User ${i}`,
      email: `user${i}@example.com`,
    });
  }
  await Order.create({
    product: "Sample Product",
    price: 10000,
  });
})();

// 로그 디렉터리 생성
const logDirectory = path.join(__dirname, "logs");
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

app.use(express.json());
// 미들웨어로 메트릭 수집
// app.use(metricsMiddleware);
app.use(metricsMiddleware(containerName));
app.use(responseLoggingMiddleware);
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
        response: res.body, // 응답 객체를 response 키에 추가
      }
    );
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

app.get("/metrics", async (req, res) => {
  try {
    // 애플리케이션 메트릭을 가져옵니다.
    const appMetrics = await client.register.metrics();
    // PM2 메트릭을 가져옵니다.
    const pm2Metrics = await getMetrics();
    // 애플리케이션 메트릭과 PM2 메트릭을 결합합니다.
    const combinedMetrics = appMetrics + "\n" + pm2Metrics;

    // 결합한 메트릭을 응답으로 반환합니다.
    res.set("Content-Type", "text/plain");
    res.send(combinedMetrics);
  } catch (err) {
    res.status(500).send(err.toString());
  }
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

// 데이터베이스에서 데이터를 검색하는 예제
app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    logger.error({ message: err.message, status: 500 });
    res.status(500).send("데이터베이스 오류");
  }
});

app.post("/users", async (req, res) => {
  try {
    // Create a new user object using the request body
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
    });

    // Send the new user object back in the response
    res.status(201).json(newUser);
  } catch (error) {
    // Handle any errors that occur during user creation
    logger.error(error);
    res.status(500).json({ message: "Error creating user" });
  }
});

app.put("/users/1", async (req, res) => {
  // 예를 들어, 사용자의 이메일을 업데이트하려고 한다고 가정합니다.
  const updatedEmail = req?.body?.email;

  try {
    const user = await User.findOne({ where: { id: 1 } });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    user.email = updatedEmail;
    await user.save();

    res
      .status(200)
      .send({ message: "User 1 email updated", email: updatedEmail });
  } catch (error) {
    logger.error(error);
    res.status(500).send({ message: "Error updating user email" });
  }
});

// 동시성 해결 못함
// app.post("/api/orders/decrement", async (req, res) => {
//   try {
//     const orderId = req.body.orderId;

//     const order = await Order.findByPk(orderId);
//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     if (order.price >= 100) {
//       order.price -= 100;
//       await order.save();
//     }

//     res.json(order);
//   } catch (err) {
//     logger.error(err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

//
app.post("/api/orders/decrement", async (req, res) => {
  try {
    const orderId = req.body.orderId;

    // Start a new transaction
    const transaction = await sequelize.transaction();

    try {
      // Lock the order record for update within the transaction
      const order = await Order.findByPk(orderId, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (!order) {
        await transaction.rollback();
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.price >= 100) {
        // Decrement the price within the transaction
        order.price -= 100;
        await order.save({ transaction });

        // Commit the transaction
        await transaction.commit();
      } else {
        // Release the lock by rolling back the transaction
        await transaction.rollback();
      }

      res.json(order);
    } catch (err) {
      // Rollback the transaction in case of an error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/orders/:id 엔드포인트를 생성합니다.
app.get("/api/orders/:id", async (req, res) => {
  const orderId = parseInt(req.params.id, 10);

  try {
    const order = await Order.findByPk(orderId);

    if (!order) {
      res.status(404).send({ message: "Order not found" });
    } else {
      res.send(order);
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send({ message: "Internal server error" });
  }
});

process.on("unhandledRejection", (reason, promise) => {
  if (reason instanceof Error) {
    logger.error(
      `Unhandled Rejection at: ${JSON.stringify(promise)}, reason: ${
        reason.stack
      }`
    );
  } else {
    logger.error(
      `Unhandled Rejection at: ${JSON.stringify(
        promise
      )}, reason: ${JSON.stringify(reason)}`
    );
  }
});

// ... 애플리케이션 코드
app.listen(3001, () => {
  //   logger.log("Listening on port 3001");
  logger.info("Listening on port 3001");
});
