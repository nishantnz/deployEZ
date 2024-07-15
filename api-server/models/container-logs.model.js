const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const logEventsSchema = new Schema(
  {
    deploymentID: {
      type: String,
      require: true,
      unique: true,
      index: true,
    },
    projectID: {
      type: String,
      require: true,
      unique: true,
      index: true,
    },
    logs: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);
const LogEvents = mongoose.model("LogEvents", logEventsSchema);
module.exports = LogEvents;
