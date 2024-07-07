const express = require("express");
const router = express.Router();
const {
  loginUser,
  registerUser,
} = require("../controllers/user.controller.js");

const register = router.post("/register", registerUser);
const login = router.post("/login", loginUser);

module.exports = { register, login };
