const mongoose = require("mongoose");

const dotenv = require("dotenv");
dotenv.config({
  path: "../.env",
});
const connectDB = async () => {
  try {
    console.log(process.env.MONGO_DB_URL);
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_DB_URL}`
    );
    console.log(
      `\n MongoDB connected. DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error("ERROR: ", error);
    process.exit(1);
  }
};

module.exports = connectDB;
