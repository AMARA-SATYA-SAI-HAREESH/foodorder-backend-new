const mongoose = require("mongoose");

const configDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB);
    console.log("Connected to DB");
  } catch (error) {
    console.log("Error while connecting to db", error);
  }
};

module.exports = configDB;
