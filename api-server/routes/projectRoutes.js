const authenticateToken = require("../middlewares/verifyToken.js");
const createProject = require("../controllers/createProject.controller.js");
const deployProject = require("../controllers/deployProject.controller.js");
const express = require("express");
const router = express.Router();

const create_project = router.post(
  "/createProject",
  authenticateToken,
  createProject
);

const deploy_project = router.post("/deploy", authenticateToken, deployProject);
module.exports = { create_project, deploy_project };
