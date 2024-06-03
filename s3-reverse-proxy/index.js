const express = require("express");
const httpproxy = require("http-proxy");

const app = express();
const PORT = 8000;
const proxy = httpproxy.createProxy();
const BASE_URL = `https://deploy-ez.s3.ap-south-1.amazonaws.com/__outputs`;

app.use((req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];

  const resolvesTo = `${BASE_URL}/${subdomain}`;
  proxy.web(req, res, { target: resolvesTo, changeOrigin: true, secure: true });
});

proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") {
    proxyReq.path += "index.html";
  }
});

app.listen(PORT, () => {
  console.log(`Reverse Proxy Initiated, running on PORT: ${PORT}`);
});
