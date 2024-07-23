const express = require("express");
const httpproxy = require("http-proxy");
const { PrismaClient } = require("@prisma/client");
const app = express();
const PORT = 8000;
const proxy = httpproxy.createProxy();
const BASE_URL = `https://deploy-ez.s3.ap-south-1.amazonaws.com/__outputs`;

const prisma = new PrismaClient();

app.use(async (req, res) => {
  try {
    const hostname = req.hostname;
    console.log("Hostname: ", hostname);
    const userSubdomain = hostname.split(".")[0];
    console.log("User subdomain: ", userSubdomain);

    const project = await prisma.project.findFirst({
      where: {
        subDomain: userSubdomain,
      },
    });

    let resolvesTo;
    if (!project) {
      const project = await prisma.project.findFirst({
        where: {
          customDomain: userSubdomain,
        },
      });
      if (!project)
        return res.status(500).json({
          message: "project not found",
        });
      console.log("Project: ", project);
      resolvesTo = `${BASE_URL}/${project.id}/${project.customDomain}`;
    } else {
      if (!project)
        return res.status(500).json({
          message: "project not found",
        });
      console.log("Project: ", project);
      resolvesTo = `${BASE_URL}/${project.id}/${project.subDomain}`;
    }

    console.log("Resolves to: ", resolvesTo);
    proxy.web(req, res, {
      target: resolvesTo,
      changeOrigin: true,
      secure: true,
    });
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).send("Internal Server Error");
  }
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
