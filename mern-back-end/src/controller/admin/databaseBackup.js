const fs = require("node:fs");
const path = require("node:path");
const backups = require("../../lib/databaseBackups");

exports.listBackups = async (_req, res) => {
  try {
    backups.encryptionKey();
    const files = await backups.listDatabaseBackups();
    res.json({ backups: files, schedule: "00:15 and 12:15 UTC", retentionCount: Math.min(200, Math.max(2, Number.parseInt(process.env.DATABASE_BACKUP_RETENTION_COUNT, 10) || 30)) });
  } catch (error) { res.status(error.statusCode || 500).json({ message: error.message || "Could not list database backups." }); }
};

exports.createBackup = async (_req, res) => {
  try { res.status(201).json({ backup: await backups.createDatabaseBackup() }); }
  catch (error) { res.status(error.statusCode || 500).json({ message: error.message || "Could not create the database backup." }); }
};

exports.downloadBackup = async (req, res) => {
  const { filename } = req.params;
  if (!backups.isSafeBackupName(filename)) return res.status(400).json({ message: "Invalid backup filename." });
  const filePath = path.join(backups.backupDir, filename);
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) return res.status(404).json({ message: "Backup was not found." });
    res.setHeader("Cache-Control", "private, no-store");
    res.download(filePath, filename, (error) => { if (error && !res.headersSent) res.status(500).json({ message: "Could not download the backup file." }); });
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ message: "Backup was not found." });
    return res.status(500).json({ message: "Could not access the backup file." });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Select an encrypted .sdb backup file." });
    if (!req.file.originalname.toLowerCase().endsWith(".sdb")) return res.status(400).json({ message: "Only encrypted Subazen .sdb backup files can be restored." });
    const result = await backups.restoreDatabaseBackup(req.file.path, req.body?.confirmation);
    return res.json({ message: "Database restore completed. The pre-restore database backup was also saved.", restore: result });
  } catch (error) { return res.status(error.statusCode || 500).json({ message: error.message || "Database restore failed." }); }
  finally { await backups.removeTemporaryUpload(req.file?.path).catch(() => {}); }
};
