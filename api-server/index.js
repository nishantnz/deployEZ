const express = require("express");

const { register, login } = require("./routes/userRoutes.js");

const app = express();
const PORT = 9000;
const dotenv = require("dotenv");
const { deploy_project, create_project } = require("./routes/projectRoutes.js");

dotenv.config();

app.use(express.json());
app.use("/api/v1", register);
app.use("/api/v1", login);
app.use("/api/v1", create_project);
app.use("/api/v1", deploy_project);

app.listen(PORT, () => {
  console.log(`API SERVER RUNNING ON PORT ${PORT}`);
});
