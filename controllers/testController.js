const testApiController = (req, res) => {
  res.status(200).send("hello world testing api");
};
module.exports = { testApiController };
