const { exec } = require("child_process");
const path = require("path");
const { readFile, writeFile, readdirSync } = require("fs");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  credentials: {
    accessKeyId: "",
    secretAccessKey: "",
    },
    region:"ap-south-1"
});

async function init() {
  console.log("Executing Script.js....");
  const outputDir = path.join(__dirname, "output");

  const p = exec(`cd ${outputDir} && npm install && npm run build`);

  p.stdout.on(`data`, function (data) {
    console.log(data.toString());
  });

  p.stdout.on(`error`, function (data) {
    console.log("ERROR: ", data.toString());
  });

  p.on("close", async function () {
    console.log("Build complete");

    const distFolderPath = path.join(__dirname, "output", "dist");
    const distFolderContents = readdirSync(distFolderPath, { recursive: true });

    for (const filename of distFolderContents) {
        if (lstatSync(filename).isDirectory()) continue;
        
        const command = new PutObjectCommand({
            Bucket: "deployEZ",
            Key: ""
        })
    }
  });
}
