const express = require("express");
const router = express.Router();
const {
  loginUser,
  registerUser,
} = require("../controllers/user.controller.js");
const authenticateToken = require("../middlewares/verifyToken.js");

const createProject = require("../controllers/createProject.controller.js");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/createProject", authenticateToken, createProject);
module.exports = { router };
