const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      status: "Unauthorized",
      status_code: 401,
      message: "Token is missing",
    });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        status: "Forbidden",
        status_code: 403,
        message: "Invalid token",
      });
    }

    req.user = user;
    next();
  });
};
module.exports = authenticateToken;
