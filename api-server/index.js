const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const app = express();
const PORT = 9000;

app.use(express.json());

const ecsClient = new ECSClient({
  credentials: {
    accessKeyId: "AKIA47CRYOU2JW7QEJPV",
    secretAccessKey: "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",
  },
  region: "ap-south-1",
});

const config = {
  CLUSTER:
    "arn:aws:ecs:ap-south-1:891377186100:cluster/deployez-builder-cluster",
  TASK: "arn:aws:ecs:ap-south-1:891377186100:task-definition/deployez-builder-task",
};

app.post("/api/v1/project", async (req, res) => {
  const projectSlug = generateSlug();
  const { gitURL } = req.body;
  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: [
          "subnet-0796e4616be7b956a",
          "subnet-0d0af259d4df3378e",
          "subnet-041572c5971a690c6",
        ],
        securityGroups: ["sg-029624e427f0509f1"],
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
              value: projectSlug,
            },
          ],
        },
      ],
    },
  });
  await ecsClient.send(command);
  return res.json({
    status: "queued",
    data: { projectSlug, url: `http://${projectSlug}.localhost:8000` },
  });
});

app.listen(PORT, () => {
  console.log(`API SERVER RUNNING ON PORT ${PORT}`);
});
