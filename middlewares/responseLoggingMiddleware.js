module.exports = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (data) {
    res.body = data;
    originalSend.apply(res, arguments);
  };

  res.json = function (data) {
    res.body = JSON.stringify(data);
    originalJson.apply(res, arguments);
  };
  next();
};
