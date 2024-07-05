const jwt = require("jsonwebtoken");
const { emailRegex } = require("../utils/constants.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({
      status: "Bad Request",
      status_code: 400,
      message: "Name, email, and password are required",
    });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: "Bad Request",
      status_code: 400,
      message: "Email must be a valid Gmail address",
    });
  }
  let passwordErrors = [];

  if (password.length < 10) {
    passwordErrors.push("Password Should be atleast 10 characters Long.");
  }
  if (!/[a-z]/.test(password)) {
    passwordErrors.push("Password Should Contain Lowercase Letters.");
  }
  if (!/[A-Z]/.test(password)) {
    passwordErrors.push("Password Should Contain Uppercase Letters.");
  }
  if (!/[0-9]/.test(password)) {
    passwordErrors.push("Password Should Contain atleast one digit.");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    passwordErrors.push(
      "Password Should Contain atleast one Special Character."
    );
  }

  if (passwordErrors.length > 0) {
    return res.status(400).json({
      status: "Bad Request",
      status_code: 400,
      message: "Password validation failed",
      errors: { passwordErrors },
    });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });
    if (existingUser) {
      return res.status(400).json({
        status: "Bad Request",
        status_code: 200,
        message: "Account Already Exists",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
      },
    });

    res.status(200).json({
      status: "Account Succesfully Created",
      status_code: 200,
      user_id: newUser.id,
    });
  } catch (error) {
    console.error("Error creating user: ", error);
    res.status(500).json({
      status: "Internal Server Error",
      status_code: 500,
      message: "An error occurred while creating the account",
    });
  }
};

const loginUser = async (req, res) => {
  const { username, email, password } = req.body;
  if (!((username || email) && password)) {
    return res.status(400).json({
      status: "Bad Request",
      status_code: 400,
      message: "Username/email and Password are Required",
    });
  }
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });
  if (!existingUser) {
    return res.status(400).json({
      status: "Bad Request",
      status_code: 400,
      message: "User Does Not Exists",
    });
  }

  const passwordMatch = await bcrypt.compare(password, existingUser.password);
  if (!passwordMatch) {
    return res.status(401).json({
      status: "Uauthorized",
      status_code: 401,
      message: "Password Incorrect",
    });
  }
  res.status(200).json({
    status: "Succesfully Logged In",
    status_code: 200,
    user_id: existingUser.id,
  });
};

module.exports = { loginUser, registerUser };
