const express = require("express");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const app = express();
const PORT = 9000;
const { clusterInfo } = require("./constants.js");
app.use(express.json());

const ecsClient = new ECSClient({
  credentials: {
    accessKeyId: "AKIA47CRYOU2JW7QEJPV",
    secretAccessKey: "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",
  },
  region: "ap-south-1",
});

const config = {
  CLUSTER: clusterInfo.clusterName,
  TASK: clusterInfo.taskDefination,
};

app.post("/api/v1/project", async (req, res) => {
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
          name: "builder-image",
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
