const path = require("node:path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const mongoose = require("mongoose");
const backups = require("../lib/databaseBackups");

async function run() {
  const user = encodeURIComponent(process.env.MONGO_DB_USER || "");
  const password = encodeURIComponent(process.env.MONGO_DB_PASSWORD || "");
  const host = process.env.MONGO_DB_HOST;
  const database = encodeURIComponent(process.env.MONGO_DB_DATABASE || "");
  if (!user || !password || !host || !database) throw new Error("MongoDB connection settings are missing.");
  if (!process.env.DATABASE_BACKUP_ENCRYPTION_KEY) throw new Error("DATABASE_BACKUP_ENCRYPTION_KEY is not configured.");
  const mongoUri = `mongodb+srv://${user}:${password}@${host}/${database}?authSource=admin&retryWrites=true&w=majority`;
  const positiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  };
  await mongoose.connect(mongoUri, {
    maxPoolSize: positiveInt(process.env.MONGO_MAX_POOL_SIZE, 100),
    serverSelectionTimeoutMS: positiveInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10000),
    connectTimeoutMS: positiveInt(process.env.MONGO_CONNECT_TIMEOUT_MS, 10000),
  });
  try {
    await mongoose.connection.db.admin().ping();
    await backups.createDatabaseBackup({ scheduled: true });
  } finally { await mongoose.disconnect(); }
}

run().catch((error) => {
  console.error("[db-backup-cron] Backup job failed:", error.message);
  process.exitCode = 1;
  mongoose.disconnect().catch(() => {});
});
