const express = require("express");

const { register, login } = require("./routes/userRoutes.js");

const dotenv = require("dotenv");
const { deploy_project, create_project } = require("./routes/projectRoutes.js");

const connectDb = require("./db/dbconnect.js");
const kafkaConsumerInit = require("./kafkaConsumer.js");

const app = express();

dotenv.config();

const PORT = 9000;
app.use(express.json());
app.use("/api/v1", register);
app.use("/api/v1", login);
app.use("/api/v1", create_project);
app.use("/api/v1", deploy_project);

connectDb().then(() => {
  kafkaConsumerInit().catch((err) => {
    console.error("Kafka Consumer Initialization Failed", err);
    process.exit(1);
  });
});

app.listen(PORT, () => {
  console.log(`API SERVER RUNNING ON PORT ${PORT}`);
});
