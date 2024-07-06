const express = require("express");
const { RunTaskCommand } = require("@aws-sdk/client-ecs");
const { clusterInfo } = require("./utils/constants.js");
const jwt = require("jsonwebtoken");
const { ecsClient, config } = require("./utils/ecsclient.js");
const userRoutes = require("./routes/userRoutes.js");

const app = express();
const PORT = 9000;

app.use(express.json());
app.use("/api/v1", userRoutes);
app.post("api/v1/project", async (req, res) => {});
app.post("/api/v1/deploy", async (req, res) => {
  const { gitURL, customDomainName } = req.body;
  if (!gitURL && !customDomainName) {
    return res
      .status(400)
      .json({ error: "Either Git URL or custom Domain Name must be provided" });
  }
  let repoName;
  if (gitURL) {
    const parts = gitURL.split("/");
    const repoNameWithGit = parts[parts.length - 1];
    repoName = repoNameWithGit.replace(".git", "");
  }

  const project_name = customDomainName || repoName;

  if (!project_name) {
    return res
      .status(400)
      .json({ error: "Invalid input: Unable to determine project name" });
  }
  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: [
          clusterInfo.subnet1,
          clusterInfo.subnet2,
          clusterInfo.subnet3,
        ],
        securityGroups: [clusterInfo.securityGroup1],
        assignPublicIp: "ENABLED",
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: clusterInfo.containerOverridesName,
          environment: [
            {
              name: "GIT_REPOSITORY_URL",
              value: gitURL,
            },
            {
              name: "PROJECT_ID",
              value: project_name,
            },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);
  return res.json({
    status: "queued",
    data: { project_name, url: `http://${project_name}.localhost:8000` },
  });
});

app.listen(PORT, () => {
  console.log(`API SERVER RUNNING ON PORT ${PORT}`);
});
