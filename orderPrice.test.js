const axios = require("axios");

describe("Check the final order price after concurrency test", () => {
  test("Final price should be 0", async () => {
    const response = await axios.get("http://localhost:3001/api/orders/1");
    const order = response.data;

    expect(order.price).toBe(0);
  });
});
