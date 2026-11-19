import React, { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Container, Form, Modal, Spinner, Table } from "react-bootstrap";
import { FaDatabase, FaDownload, FaRedoAlt, FaShieldAlt } from "react-icons/fa";
import Layout from "../../components/Layout";
import axios, { getApiErrorMessage } from "../../helpers/axios";
import "./style.css";

const formatBytes = (bytes) => {
  if (!Number.isFinite(Number(bytes))) return "—";
  const size = Number(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024 ** 3).toFixed(2)} GB`;
};

export default function DatabaseBackups() {
  const [backups, setBackups] = useState([]);
  const [schedule, setSchedule] = useState("00:15 and 12:15 UTC");
  const [retentionCount, setRetentionCount] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [confirmation, setConfirmation] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await axios.get("/admin/database-backups");
      setBackups(response.data?.backups || []);
      setSchedule(response.data?.schedule || "00:15 and 12:15 UTC");
      setRetentionCount(response.data?.retentionCount || 30);
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Could not load database backups.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createBackup = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await axios.post("/admin/database-backups");
      setMessage(`Encrypted backup created: ${response.data.backup.filename}`);
      await refresh();
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Could not create a database backup.")); }
    finally { setBusy(false); }
  };

  const downloadBackup = async (filename) => {
    setBusy(true); setError("");
    try {
      const response = await axios.get(`/admin/database-backups/${encodeURIComponent(filename)}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Could not download the encrypted backup.")); }
    finally { setBusy(false); }
  };

  const restore = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(); form.append("backup", restoreFile); form.append("confirmation", confirmation);
    try {
      const response = await axios.post("/admin/database-backups/restore", form);
      setMessage(`${response.data.message} Pre-restore backup: ${response.data.restore.preRestoreBackup}`);
      setRestoreOpen(false); setRestoreFile(null); setConfirmation("");
      await refresh();
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Could not restore the database backup.")); }
    finally { setBusy(false); }
  };

  return <Layout sidebar><Container fluid className="database-backups-page py-3">
    <header className="database-backups-heading"><div><span className="database-backups-eyebrow">DATA PROTECTION</span><h1>Database backups</h1><p>Encrypted database backups are stored privately on this server and are available for download.</p></div><FaDatabase aria-hidden="true" /></header>
    {error && <Alert variant="danger" role="alert" dismissible onClose={() => setError("")}>{error}</Alert>}
    {message && <Alert variant="success" role="status" dismissible onClose={() => setMessage("")}>{message}</Alert>}
    <Alert variant="info" className="database-backups-note"><FaShieldAlt aria-hidden="true" /><div><strong>Automatic schedule: every 12 hours</strong><span>Runs at {schedule}. The server keeps the newest {retentionCount} encrypted backups. The encryption key is required to restore them; keep a separate copy somewhere secure.</span></div></Alert>
    <Card className="database-backups-card"><Card.Header><div><h2>Saved backups</h2><p>Backup files are encrypted with AES-256-GCM and are not served from the public uploads folder.</p></div><div className="database-backups-actions"><Button variant="outline-primary" onClick={refresh} disabled={loading || busy}><FaRedoAlt aria-hidden="true" /> Refresh</Button><Button onClick={createBackup} disabled={busy || loading}>{busy ? <><Spinner size="sm" className="me-2" />Working…</> : "Create backup now"}</Button></div></Card.Header>
      <div className="table-responsive"><Table hover responsive={false} className="database-backups-table mb-0 align-middle"><thead><tr><th>Backup file</th><th>Created</th><th>Size</th><th>Encryption</th><th>Actions</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="5" className="database-backups-empty"><Spinner size="sm" className="me-2" />Loading backups…</td></tr> : backups.map((backup) => <tr key={backup.filename}><td><strong>{backup.filename}</strong></td><td>{new Date(backup.createdAt).toLocaleString()}</td><td>{formatBytes(backup.size)}</td><td><Badge bg="success">Encrypted</Badge></td><td><Button size="sm" variant="outline-primary" onClick={() => downloadBackup(backup.filename)} disabled={busy}><FaDownload aria-hidden="true" /> <span className="ms-1">Download</span></Button></td></tr>)}
        {!loading && !backups.length && <tr><td colSpan="5" className="database-backups-empty">No backups yet. Scheduled backups will appear here after the next run.</td></tr>}
      </tbody></Table></div>
      <Card.Footer><Button variant="outline-danger" onClick={() => { setRestoreOpen(true); setError(""); setConfirmation(""); }} disabled={busy}>Restore from backup</Button><span>Restore first creates a safety backup of the current database.</span></Card.Footer>
    </Card>

    <Modal show={restoreOpen} onHide={() => !busy && setRestoreOpen(false)} centered dialogClassName="database-restore-modal"><Form onSubmit={restore}><Modal.Header closeButton><div><Modal.Title>Restore database</Modal.Title><div className="small text-muted">This replaces the current database contents.</div></div></Modal.Header><Modal.Body>
      <Alert variant="warning"><strong>Destructive action.</strong> The current database will be replaced by the uploaded backup. A safety backup of the current database is created first.</Alert>
      <Form.Group className="mb-3"><Form.Label>Encrypted backup (.sdb)</Form.Label><Form.Control type="file" accept=".sdb,application/octet-stream" required onChange={(event) => setRestoreFile(event.target.files?.[0] || null)} /></Form.Group>
      <Form.Group><Form.Label>Type RESTORE DATABASE to confirm</Form.Label><Form.Control autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Form.Group>
    </Modal.Body><Modal.Footer><Button variant="outline-secondary" type="button" onClick={() => setRestoreOpen(false)} disabled={busy}>Cancel</Button><Button variant="danger" type="submit" disabled={busy || confirmation !== "RESTORE DATABASE" || !restoreFile}>{busy ? <><Spinner size="sm" className="me-2" />Restoring…</> : "Replace database"}</Button></Modal.Footer></Form></Modal>
  </Container></Layout>;
}
