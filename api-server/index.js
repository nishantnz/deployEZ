const express = require("express");
const { RunTaskCommand } = require("@aws-sdk/client-ecs");
const { clusterInfo } = require("./utils/constants.js");

const { ecsClient, config } = require("./utils/ecsclient.js");
const { router } = require("./routes/userRoutes.js");
const { PrismaClient } = require("@prisma/client");
const app = express();
const PORT = 9000;
const dotenv = require("dotenv");
const authenticateToken = require("./middlewares/verifyToken.js");
dotenv.config();
const prisma = new PrismaClient();

app.use(express.json());
app.use("/api/v1", router);

app.post("/api/v1/deploy", authenticateToken, async (req, res) => {
  const { projectID } = req.body;

  const project = await prisma.project.findUnique({
    where: {
      id: projectID,
    },
  });

  if (!project) {
    return res.status(404).json({
      error: "Project Not Found",
    });
  }

  if (!project.gitURL && !project.customDomain) {
    return res.status(400).json({
      status: "Bad Request",
      status_code: 400,
      message: "Either Git URL or custom Domain Name must be provided",
    });
  }
  const existingDeployment = await prisma.deployment.findFirst({
    where: {
      projectID: projectID,
      status: {
        in: ["IN_PROG", "QUEUED"],
      },
    },
  });

  if (existingDeployment) {
    return res.status(400).json({
      status: "Deployment is Queued and Already in Progress",
      status_code: 400,
      message:
        "A deployment is already queued or in progress for this project.",
    });
  }

  //if custom domain name not present
  let repoName;
  if (project.gitURL) {
    const parts = project.gitURL.split("/");
    const repoNameWithGit = parts[parts.length - 1];
    repoName = repoNameWithGit.replace(".git", "");
  }
  let project_name;
  if (!project.customDomain) {
    project_name = repoName;
  } else {
    project_name = project.customDomain;
  }

  if (!project_name) {
    return res
      .status(400)
      .json({ error: "Invalid input: Unable to determine project name" });
  }

  const deployment = await prisma.deployment.create({
    data: {
      status: "QUEUED",
      projectID: projectID,
    },
  });

  res.status(201).json({
    status: "Deployment Queued Successfully",
    status_code: 201,
    deployment_id: deployment.id,
  });

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
              value: project.gitURL,
            },
            {
              name: "PROJECT_ID",
              value: projectID,
            },
            {
              name: "Deployment_ID",
              value: deployment.id,
            },
            {
              name: "Project_Name",
              value: project_name,
            },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);

  res.status(201).json({
    status: "Deployment Queued Successfully",
    status_code: 201,
    deployment_id: deployment.id,
    projectID,
    data: {
      project_name,
      url: `http://${project_name}.localhost:8000`,
    },
  });
});

app.listen(PORT, () => {
  console.log(`API SERVER RUNNING ON PORT ${PORT}`);
});
