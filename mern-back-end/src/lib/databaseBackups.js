const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { promisify } = require("node:util");
const { Readable, pipeline } = require("node:stream");
const { createGzip, createGunzip } = require("node:zlib");
const { EJSON } = require("bson");

const pipelineAsync = promisify(pipeline);
const MAGIC = Buffer.from("SUBAZENDB1");
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + IV_BYTES;
const DEFAULT_BACKUP_DIR = path.resolve(__dirname, "../../private-db-backups");
const backupDir = path.resolve(process.env.DATABASE_BACKUP_DIR || DEFAULT_BACKUP_DIR);
const uploadDir = path.join(backupDir, ".restore-tmp");
let currentJob = null;

const secureDirectory = async (directory) => {
  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  await fs.promises.chmod(directory, 0o700);
};
const jsonLine = (value) => `${EJSON.stringify(value, { relaxed: false })}\n`;

function encryptionKey() {
  const encoded = process.env.DATABASE_BACKUP_ENCRYPTION_KEY || "";
  let key;
  try { key = Buffer.from(encoded, "base64"); } catch (_) { key = null; }
  if (!key || key.length !== 32 || key.toString("base64") !== encoded) {
    const error = new Error("Database backup encryption is not configured. Set DATABASE_BACKUP_ENCRYPTION_KEY to a base64-encoded 32-byte key.");
    error.statusCode = 503;
    throw error;
  }
  return key;
}

async function writeEncrypted(plainPath, encryptedPath, key) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const handle = await fs.promises.open(encryptedPath, "wx", 0o600);
  try { await handle.write(Buffer.concat([MAGIC, iv])); }
  finally { await handle.close(); }
  await pipelineAsync(fs.createReadStream(plainPath), createGzip(), cipher, fs.createWriteStream(encryptedPath, { flags: "a" }));
  await fs.promises.appendFile(encryptedPath, cipher.getAuthTag());
}

async function decryptToPlain(encryptedPath, plainPath, key) {
  const info = await fs.promises.stat(encryptedPath);
  if (!info.isFile() || info.size <= HEADER_BYTES + TAG_BYTES) throw new Error("The backup file is empty or incomplete.");
  const handle = await fs.promises.open(encryptedPath, "r");
  let header, tag;
  try {
    header = Buffer.alloc(HEADER_BYTES); tag = Buffer.alloc(TAG_BYTES);
    await handle.read(header, 0, HEADER_BYTES, 0);
    await handle.read(tag, 0, TAG_BYTES, info.size - TAG_BYTES);
  } finally { await handle.close(); }
  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("This is not a supported Subazen database backup.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, header.subarray(MAGIC.length));
  decipher.setAuthTag(tag);
  try {
    await pipelineAsync(fs.createReadStream(encryptedPath, { start: HEADER_BYTES, end: info.size - TAG_BYTES - 1 }), decipher, createGunzip(), fs.createWriteStream(plainPath, { flags: "wx", mode: 0o600 }));
  } catch (error) {
    await fs.promises.rm(plainPath, { force: true });
    if (error.code === "Z_DATA_ERROR" || error.code === "ERR_CRYPTO_INVALID_AUTH_TAG") throw new Error("Backup decryption failed. The file may be damaged or the encryption key may not match.");
    throw error;
  }
}

async function databaseHandle() {
  const mongoose = require("mongoose");
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) throw new Error("The database is not connected.");
  return mongoose.connection.db;
}

async function collectManifest(db) {
  const infos = await db.listCollections({}, { nameOnly: false }).toArray();
  const collections = [];
  for (const info of infos) {
    if (info.name.startsWith("system.")) continue;
    const indexes = info.type === "view" ? [] : await db.collection(info.name).indexes().catch(() => []);
    collections.push({ name: info.name, type: info.type, options: info.options || {}, indexes });
  }
  return collections;
}

async function writePlainBackup(db, plainPath) {
  async function* records() {
    const collections = await collectManifest(db);
    yield jsonLine({ kind: "manifest", format: "subazen-mongo-ejsonl", version: 1, createdAt: new Date().toISOString(), database: db.databaseName, collections });
    for (const info of collections) {
      if (info.type === "view") continue;
      const cursor = db.collection(info.name).find({}).batchSize(500);
      for await (const document of cursor) yield jsonLine({ kind: "document", collection: info.name, document });
    }
  }
  await pipelineAsync(Readable.from(records()), fs.createWriteStream(plainPath, { flags: "wx", mode: 0o600 }));
}

function backupFilename(date = new Date()) {
  const timestamp = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `subazen-db-${timestamp}-${crypto.randomBytes(4).toString("hex")}.sdb`;
}

async function withJobLock(operation) {
  if (currentJob) throw Object.assign(new Error("A database backup or restore is already running."), { statusCode: 409 });
  const job = (async () => {
    await secureDirectory(backupDir);
    const lockPath = path.join(backupDir, ".database-operation.lock");
    let handle;
    let acquired = false;
    try {
      try { handle = await fs.promises.open(lockPath, "wx", 0o600); }
      catch (error) {
        if (error.code !== "EEXIST") throw error;
        let lock = {};
        try { lock = JSON.parse(await fs.promises.readFile(lockPath, "utf8")); } catch (_) {}
        let processAlive = false;
        if (Number.isInteger(lock.pid) && lock.pid > 0) {
          try { process.kill(lock.pid, 0); processAlive = true; }
          catch (signalError) { processAlive = signalError.code === "EPERM"; }
        }
        if (processAlive) throw Object.assign(new Error("A database backup or restore is already running."), { statusCode: 409 });
        await fs.promises.rm(lockPath, { force: true });
        handle = await fs.promises.open(lockPath, "wx", 0o600);
      }
      acquired = true;
      await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      return await operation();
    } finally {
      await handle?.close().catch(() => {});
      if (acquired) await fs.promises.rm(lockPath, { force: true }).catch(() => {});
    }
  })();
  currentJob = job;
  try { return await job; } finally { if (currentJob === job) currentJob = null; }
}

async function performDatabaseBackup({ scheduled = false } = {}) {
    const key = encryptionKey();
    await secureDirectory(backupDir);
    const tempDir = await fs.promises.mkdtemp(path.join(backupDir, ".backup-"));
    const plainPath = path.join(tempDir, "database.ejsonl");
    const filename = backupFilename();
    const encryptedPath = path.join(backupDir, filename);
    try {
      await writePlainBackup(await databaseHandle(), plainPath);
      await writeEncrypted(plainPath, encryptedPath, key);
      await pruneBackups();
      const stat = await fs.promises.stat(encryptedPath);
      console.info(`[db-backup] ${scheduled ? "Scheduled" : "Manual"} encrypted backup completed: ${filename} (${stat.size} bytes)`);
      return { filename, size: stat.size, createdAt: stat.mtime.toISOString() };
    } catch (error) {
      await fs.promises.rm(encryptedPath, { force: true });
      throw error;
    } finally { await fs.promises.rm(tempDir, { recursive: true, force: true }); }
}

async function createDatabaseBackup(options = {}) {
  return withJobLock(() => performDatabaseBackup(options));
}

async function listDatabaseBackups() {
  await secureDirectory(backupDir);
  const entries = await fs.promises.readdir(backupDir, { withFileTypes: true });
  const files = await Promise.all(entries.filter((entry) => entry.isFile() && /^subazen-db-[0-9TZ-]+-[a-f0-9]{8}\.sdb$/.test(entry.name)).map(async (entry) => {
    const stat = await fs.promises.stat(path.join(backupDir, entry.name));
    return { filename: entry.name, size: stat.size, createdAt: stat.mtime.toISOString() };
  }));
  return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
}

async function pruneBackups() {
  const keep = Math.min(200, Math.max(2, Number.parseInt(process.env.DATABASE_BACKUP_RETENTION_COUNT, 10) || 30));
  const files = await listDatabaseBackups();
  await Promise.all(files.slice(keep).map((file) => fs.promises.rm(path.join(backupDir, file.filename), { force: true })));
}

function validatePlainBackup(plainPath) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(plainPath);
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    let manifest = null, documents = 0;
    lines.on("line", (line) => {
      try {
        if (!line.trim()) return;
        const entry = EJSON.parse(line, { relaxed: false });
        if (!manifest) {
          if (entry.kind !== "manifest" || entry.format !== "subazen-mongo-ejsonl" || Number(entry.version) !== 1 || !Array.isArray(entry.collections)) throw new Error("Backup manifest is invalid or unsupported.");
          manifest = entry;
          return;
        }
        if (entry.kind !== "document" || typeof entry.collection !== "string" || !entry.document || !manifest.collections.some((collection) => collection.name === entry.collection && collection.type !== "view")) throw new Error("Backup contains an invalid document entry.");
        documents += 1;
      } catch (error) { lines.close(); input.destroy(); reject(error); }
    });
    lines.on("close", () => manifest ? resolve({ manifest, documents }) : reject(new Error("Backup manifest is missing.")));
    input.on("error", reject);
  });
}

async function applyBackup(db, plainPath, manifest) {
  await db.dropDatabase();
  const realCollections = manifest.collections.filter((item) => item.type !== "view");
  for (const item of realCollections) await db.createCollection(item.name, item.options || {});
  const views = manifest.collections.filter((item) => item.type === "view");
  for (const item of views) await db.createCollection(item.name, item.options || {});

  const lines = readline.createInterface({ input: fs.createReadStream(plainPath), crlfDelay: Infinity });
  let firstLine = true, activeCollection = null, batch = [];
  const flush = async () => {
    if (batch.length) await db.collection(activeCollection).insertMany(batch, { ordered: true });
    batch = [];
  };
  for await (const line of lines) {
    if (!line.trim()) continue;
    const entry = EJSON.parse(line, { relaxed: false });
    if (firstLine) { firstLine = false; continue; }
    if (activeCollection !== entry.collection) { await flush(); activeCollection = entry.collection; }
    batch.push(entry.document);
    if (batch.length >= 500) await flush();
  }
  await flush();
  for (const item of realCollections) {
    for (const index of (item.indexes || []).filter((candidate) => candidate.name !== "_id_")) {
      const options = { ...index };
      delete options.v; delete options.ns; delete options.background; delete options.key;
      await db.collection(item.name).createIndex(index.key, options);
    }
  }
}

async function restoreDatabaseBackup(encryptedPath, confirmation) {
  if (confirmation !== "RESTORE DATABASE") throw Object.assign(new Error('Type "RESTORE DATABASE" to confirm replacing the current database.'), { statusCode: 400 });
  return withJobLock(async () => {
    const key = encryptionKey();
    await secureDirectory(backupDir);
    const tempDir = await fs.promises.mkdtemp(path.join(backupDir, ".restore-"));
    const plainPath = path.join(tempDir, "database.ejsonl");
    try {
      await decryptToPlain(encryptedPath, plainPath, key);
      const { manifest, documents } = await validatePlainBackup(plainPath);
      const beforeRestore = await performDatabaseBackup({ scheduled: false });
      await applyBackup(await databaseHandle(), plainPath, manifest);
      console.warn(`[db-backup] Database restored from ${path.basename(encryptedPath)}; pre-restore backup: ${beforeRestore.filename}`);
      return { filename: path.basename(encryptedPath), documents, preRestoreBackup: beforeRestore.filename, restoredAt: new Date().toISOString() };
    } finally { await fs.promises.rm(tempDir, { recursive: true, force: true }); }
  });
}

function isSafeBackupName(filename) { return typeof filename === "string" && /^subazen-db-[0-9TZ-]+-[a-f0-9]{8}\.sdb$/.test(filename); }

async function removeTemporaryUpload(filePath) {
  if (!filePath) return;
  const absolute = path.resolve(filePath);
  if (absolute.startsWith(`${path.resolve(uploadDir)}${path.sep}`)) await fs.promises.rm(absolute, { force: true });
}

module.exports = {
  backupDir,
  uploadDir,
  secureDirectory,
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  isSafeBackupName,
  removeTemporaryUpload,
  encryptionKey,
};
