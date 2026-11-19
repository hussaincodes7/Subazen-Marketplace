const crypto = require("node:crypto");
const fs = require("node:fs");
const multer = require("multer");
const express = require("express");
const requireSignin = require("../../middleware/auth");
const controller = require("../../controller/admin/databaseBackup");
const backups = require("../../lib/databaseBackups");

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => fs.mkdir(backups.uploadDir, { recursive: true, mode: 0o700 }, (error) => callback(error, backups.uploadDir)),
    filename: (_req, _file, callback) => callback(null, `${crypto.randomUUID()}.restore-upload`),
  }),
  limits: { fileSize: Math.min(20 * 1024 ** 3, Math.max(1024 ** 2, Number.parseInt(process.env.DATABASE_BACKUP_MAX_UPLOAD_BYTES, 10) || 2 * 1024 ** 3)), files: 1 },
});
const fullAdmin = [requireSignin, requireSignin.requireFullAdmin];

router.get("/database-backups", ...fullAdmin, controller.listBackups);
router.post("/database-backups", ...fullAdmin, controller.createBackup);
router.get("/database-backups/:filename/download", ...fullAdmin, controller.downloadBackup);
router.post("/database-backups/restore", ...fullAdmin, upload.single("backup"), controller.restoreBackup);

module.exports = router;
