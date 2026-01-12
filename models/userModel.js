const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: [true, "userName is required"],
  },
  email: {
    type: String,
    required: [true, "email is required"],
  },
  password: {
    type: String,
    required: [true, "password is required"],
  },
  address: {
    type: String,
    required: [true, "address is required"],
  },
  phone: {
    type: String,
    required: [true, "phone required"],
  },
  answer: {
    type: String,
    required: [true, "answer required"],
  },
  userType: {
    type: String,
    default: "user",
    enum: ["admin", "user", "driver", "vendor"],
  },
  profile: {
    type: String,
    default:
      "https://static.vecteezy.com/system/resources/previews/024/983/914/large_2x/simple-user-default-icon-free-png.png",
  },
});

module.exports = mongoose.model("Users", userSchema);
