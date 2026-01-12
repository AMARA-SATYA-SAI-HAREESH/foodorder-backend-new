const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const configDB = require("./config/configdb");
dotenv.config();
const app = express();
configDB();
// middlewares
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/test", require("./routes/TestRoutes"));
app.use("/user", require("./routes/userRoutes"));
app.use("/restaurant", require("./routes/restaurantRoutes"));
app.use("/catogary", require("./routes/categoryRoutes"));
app.use("/api/food", require("./routes/foodRoutes"));
app.use("/api/order", require("./routes/orderRoutes"));
// app.get("/", (req, res) => {
//   res.send("Hello world!");
// });

app.listen(process.env.PORT, () => {
  console.log(`server is running on port ${process.env.PORT}`);
});
