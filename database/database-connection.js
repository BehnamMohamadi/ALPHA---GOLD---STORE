const mongoose = require("mongoose");

const connectToDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }
  await mongoose.connect(process.env.MONGODB_URI);
};

mongoose.connection.once("connected", () => {
  console.log("[+] database connected.");
});
mongoose.connection.on("disconnected", () => {
  console.info("[i] database disconnected.");
});
mongoose.connection.on("reconnected", () => {
  console.log("[+] database reconnected.");
});
mongoose.connection.on("error", (err) => {
  console.error("[-] database error >", err);
});

module.exports = { connectToDatabase };
