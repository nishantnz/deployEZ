const { exec } = require("child_process");
const path = require("path");
const {
  readFile,
  writeFile,
  readdirSync,
  createReadStream,
  lstatSync,
  existsSync,
} = require("fs");
const mime = require("mime-types");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { log } = require("console");

const s3Client = new S3Client({
  credentials: {
    accessKeyId: "AKIA47CRYOU2JW7QEJPV",
    secretAccessKey: "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",
  },
  region: "ap-south-1",
});

const PROJECT_ID = process.env.PROJECT_ID;

async function uploadFilesToS3(directory) {
  const files = readdirSync(directory, {
    recursive: true,
  });
  for (const file of files) {
    const fullPath = path.join(directory, file);
    //if any directory exists it ignores it
    if (lstatSync(fullPath).isDirectory()) continue;
    console.log("Uploading file", file);
    const command = new PutObjectCommand({
      Bucket: "deploy-ez",
      Key: `__outputs/${PROJECT_ID}/${file}`,
      Body: createReadStream(fullPath),
      ContentType: mime.lookup(fullPath),
    });

    try {
      await s3Client.send(command);
      console.log("Uploaded file", file);
    } catch (err) {
      console.error("Error uploading file:", err);
      throw err;
    }
  }
  console.log("Uploaded all files to S3");
}

async function init() {
  console.log("Executing Script.js....");
  const outputDir = path.join(__dirname, "output");
  const staticProject = existsSync(path.join(outputDir, "index.html"));
  if (!staticProject) {
    const p = exec(`cd ${outputDir} && npm install && npm run build`);

    p.stdout.on(`data`, function (data) {
      console.log(data.toString());
    });

    p.stderr.on(`data`, function (data) {
      console.log("ERROR: ", data.toString());
    });

    p.on("close", async function () {
      console.log("Build complete,Uploading Files To S3.......");

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
        return;
      }
      // const distFolderPath = path.join(__dirname, "output", "dist" || "build");
      await uploadFilesToS3(distFolderPath);
      log("Uploaded Files to S3 bucket");
    });
  } else {
    console.log("Static project detected. Uploading files to S3.......");
    await uploadFilesToS3(outputDir);
    console.log("Uploaded all files to S3");
  }
}

init().catch(console.error);
