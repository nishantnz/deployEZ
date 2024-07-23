const { exec } = require("child_process");
const path = require("path");
const {
  readdirSync,
  createReadStream,
  lstatSync,
  existsSync,
  readFileSync,
} = require("fs");
const mime = require("mime-types");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { log, error } = require("console");
const { PrismaClient } = require("@prisma/client");
const kafka = require("./kafkaCLient.js");

const s3Client = new S3Client({
  credentials: {
    accessKeyId: "",
    secretAccessKey: "",
  },
  region: "ap-south-1",
});
const prisma = new PrismaClient();

const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const PROJECT_NAME = process.env.PROJECT_NAME;

const producer = kafka.producer();

async function publishLog(userlog) {
  log("Publishing logs on KAFKA....");
  await producer.send({
    topic: "build-server-logs",
    messages: [
      {
        partition: 0,
        key: "userlog",
        value: JSON.stringify({
          PROJECT_ID,
          DEPLOYMENT_ID,
          userlog,
        }),
      },
    ],
  });
}

async function updateDeploymentStatus(status) {
  await prisma.deployment.update({
    where: { id: DEPLOYMENT_ID },
    data: { status: status },
  });
}

async function uploadFilesToS3(directory) {
  const files = readdirSync(directory, { recursive: true });
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (lstatSync(fullPath).isDirectory()) continue;
    console.log("Uploading file", file);
    await publishLog(`Uploading File: ${file}`);
    const command = new PutObjectCommand({
      Bucket: "deploy-ez",
      Key: `__outputs/${PROJECT_ID}/${PROJECT_NAME}/${file}`,
      Body: createReadStream(fullPath),
      ContentType: mime.lookup(fullPath),
    });

    try {
      await s3Client.send(command);
      console.log("Uploaded file", file);
      await publishLog(`Uploaded File: ${file}`);
    } catch (err) {
      console.error("Error uploading file:", err);
      await publishLog(`Error uploading file: ${err}`);
      await updateDeploymentStatus("FAILURE");
      throw err;
    }
  }
  console.log("Uploaded all files to S3");
  await publishLog("FILES UPLOADED.");
}

async function buildProject(outputDir) {
  return new Promise((resolve, reject) => {
    const buildCommand = `cd ${outputDir} && npm install && npm run build`;
    const process = exec(buildCommand);

    process.stdout.on("data", async (data) => {
      console.log(data.toString());
      await publishLog(data.toString());
    });

    process.stderr.on("data", async (data) => {
      console.log("ERROR:", data.toString());
      await publishLog(`ERROR: ${data.toString()}`);
    });

    process.on("close", async (code) => {
      if (code === 0) {
        console.log("Build complete");
        await publishLog("Build complete");
        resolve();
      } else {
        const errorMsg = `Build process exited with code ${code}`;
        console.error(errorMsg);
        await publishLog(`ERROR: ${errorMsg}`);
        reject(new Error(errorMsg));
      }
    });
  });
}

async function determineProjectType(outputDir) {
  const packageJsonPath = path.join(outputDir, "package.json");

  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    if (packageJson.dependencies && packageJson.dependencies.react) {
      return "react";
    } else if (
      packageJson.devDependencies &&
      packageJson.devDependencies.vite
    ) {
      return "vite";
    } else if (packageJson.scripts && packageJson.scripts.build) {
      return "node";
    } else {
      return "static";
    }
  } else {
    const indexHtmlPath = path.join(outputDir, "index.html");
    if (existsSync(indexHtmlPath)) {
      return "static";
    } else {
      throw new Error("Unknown project type");
    }
  }
}

async function init() {
  try {
    await producer.connect();
    console.log("Executing Script.js....");
    await updateDeploymentStatus("IN_PROG");
    await publishLog("Build Started...");
    const outputDir = path.join(__dirname, "output");

    const projectType = await determineProjectType(outputDir);
    console.log(`Detected project type: ${projectType}`);
    await publishLog(`Detected project type: ${projectType}`);

    if (projectType === "static") {
      console.log("Static project detected. Uploading files to S3.......");
      await publishLog("UPLOADING YOUR FILES...");
      await uploadFilesToS3(outputDir);
    } else {
      await buildProject(outputDir);
      const possibleFolders = ["dist", "build"];
      let distFolderPath = null;
      for (const folder of possibleFolders) {
        const possibleFolderPath = path.join(outputDir, folder);
        if (existsSync(possibleFolderPath)) {
          distFolderPath = possibleFolderPath;
          break;
        }
      }
      if (!distFolderPath) {
        throw new Error("Neither 'dist' nor 'build' folder found!");
      }
      await uploadFilesToS3(distFolderPath);
    }

    await updateDeploymentStatus("READY");
    await publishLog("DONE.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    await publishLog(`ERROR: ${err}`);
    await updateDeploymentStatus("FAILURE");
    process.exit(1);
  }
}

init().catch(async (err) => {
  error(err);
  await updateDeploymentStatus("FAILURE");
  await publishLog("FAILURE");
});
