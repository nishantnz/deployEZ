const kafka = require("../build-server/kafkaCLient.js");
const LogEvents = require("./models/container-logs.model.js");

const consumer = kafka.consumer({
  groupId: "group-1",
});

const kafkaConsumerInit = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({
      topics: ["build-server-logs"],
      fromBeginning: true,
    });

    await consumer.run({
      autoCommit: false,
      eachBatch: async function ({
        heartbeat,
        batch,
        commitOffsetsIfNecessary,
        resolveOffset,
      }) {
        const messages = batch.messages;
        console.log(
          `Recieving messages...\nMessages Length -> ${messages.length}`
        );
        for (const message of messages) {
          try {
            const stringMessage = message.value.toString();
            const { PROJECT_ID, DEPLOYMENT_ID, userlog } =
              JSON.parse(stringMessage);
            await LogEvents.updateOne(
              { deploymentID: DEPLOYMENT_ID },
              {
                $set: { projectID: PROJECT_ID },
                $push: { logs: userlog }, // Append new log to the logs array
              },
              { upsert: true }
            );
            resolveOffset(message.offset);
            await commitOffsetsIfNecessary(message.offset);
            await heartbeat();
          } catch (error) {
            console.error("Error processing message:", error);
          }
        }
      },
    });
  } catch (error) {
    console.error("Error initializing Kafka consumer:", error);
    throw error;
  }
};

module.exports = kafkaConsumerInit;
