const { exec } = require("child_process");
const path = require("path");
const { readdirSync, createReadStream, lstatSync, existsSync } = require("fs");
const mime = require("mime-types");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { log, error } = require("console");
const { PrismaClient } = require("@prisma/client");
const s3Client = new S3Client({
  credentials: {
    accessKeyId: "AKIA47CRYOU2JW7QEJPV",
    secretAccessKey: "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",
  },
  region: "ap-south-1",
});
const prisma = new PrismaClient();

const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const PROJECT_NAME = process.env.PROJECT_NAME;
// function publishLog(userlog) {}

async function updateDeploymentStatus(status) {
  await prisma.deployment.update({
    where: {
      id: DEPLOYMENT_ID,
    },
    data: {
      status: status,
    },
  });
}
async function uploadFilesToS3(directory) {
  const files = readdirSync(directory, {
    recursive: true,
  });
  for (const file of files) {
    const fullPath = path.join(directory, file);
    //if any directory exists, it ignores it
    if (lstatSync(fullPath).isDirectory()) continue;
    console.log("Uploading file", file);
    //publishLog(`Uploading File: ${file}`);
    const command = new PutObjectCommand({
      Bucket: "deploy-ez",
      Key: `__outputs/${PROJECT_ID}/${PROJECT_NAME}/${file}`,
      Body: createReadStream(fullPath),
      ContentType: mime.lookup(fullPath),
    });

    try {
      await s3Client.send(command);
      console.log("Uploaded file", file);
      //publishLog(`Uploaded File: ${file}`);
    } catch (err) {
      console.error("Error uploading file:", err);
      //publishLog(`Error uploading file: ${err}`);
      await updateDeploymentStatus("FAILURE");
      throw err;
    }
  }
  console.log("Uploaded all files to S3");
  //  publishLog("FILES UPLOADED.");
}

async function init() {
  try {
    console.log("Executing Script.js....");
    await updateDeploymentStatus("IN_PROG");
    //publishLog("Build Started...");
    const outputDir = path.join(__dirname, "output");
    //to check initially whether the project is static or not
    const staticProject = existsSync(path.join(outputDir, "index.html"));
    if (!staticProject) {
      const p = exec(`cd ${outputDir} && npm install && npm run build`);

      p.stdout.on(`data`, function (data) {
        console.log(data.toString());
        //  publishLog(data.toString());
      });

      p.stderr.on(`data`, function (data) {
        console.log("ERROR: ", data.toString());
        //  publishLog(`ERROR: ${data.toString()}`);
      });

      p.on("close", async function () {
        console.log("Build complete,Uploading Files To S3.......");
        //publishLog("Build complete,\nUploading Files.......");
        const possibleFolders = ["dist", "build"];
        let distFolderPath = null;
        for (const folder of possibleFolders) {
          const possibleFolderPath = path.join(__dirname, "output", folder);
          if (existsSync(possibleFolderPath)) {
            distFolderPath = possibleFolderPath;
            break;
          }
        }
        if (!distFolderPath) {
          console.error("Neither 'dist' nor 'build' folder found!");
          // publishLog(
          //   "ERROR: Neither 'dist' nor 'build' folder found while building your project!"
          // );
          await updateDeploymentStatus("FAILURE");
          return;
        }
        // const distFolderPath = path.join(__dirname, "output", "dist" || "build");
        await uploadFilesToS3(distFolderPath);
        log("Uploaded Files to S3 bucket");
        await updateDeploymentStatus("READY");
        //  publishLog("DONE.");
      });
    } else {
      console.log("Static project detected. Uploading files to S3.......");
      //  publishLog("UPLOADING YOUR FILES...");
      await uploadFilesToS3(outputDir);
      console.log("Uploaded all files to S3");
      await updateDeploymentStatus("READY");
      //  publishLog("DONE.");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    //publishLog(`ERROR: ${err}`);
    await updateDeploymentStatus("FAILURE");
    process.exit(0);
  }
}

init().catch(async (err) => {
  error(err);
  await updateDeploymentStatus("FAILURE");
});
