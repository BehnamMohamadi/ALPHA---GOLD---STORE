const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { startLocalDatabase } = require("./start-local-db");
async function main() {
  process.env.NODE_ENV = "development";
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27029/alpha-preview?replicaSet=alphaDev";
  process.env.HOST = "127.0.0.1"; process.env.PORT = process.env.ALPHA_PORT || "3100";
  process.env.SMS_PROVIDER = "mock"; process.env.PAYMENT_GATEWAY = "mock"; process.env.ALPHA_DEMO = "true";
  const dir = path.resolve(__dirname, "../artifacts"); fs.mkdirSync(dir, { recursive: true });
  const secretFile = path.join(dir, "local-secret");
  if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(48).toString("hex"));
  process.env.JWT_SECRET = fs.readFileSync(secretFile, "utf8");
  await startLocalDatabase();
  const mongoose = require("mongoose"); await mongoose.connect(process.env.MONGODB_URI);
  await require("./seed-preview").seedPreview(); await mongoose.disconnect();
  await require("../app").startServer();
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
