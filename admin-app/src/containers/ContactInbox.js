import React, { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Form, Spinner } from "react-bootstrap";
import Layout from "../components/Layout";
import axios from "../helpers/axios";
import { getApiErrorMessage } from "../helpers/axios";
import "./ContactInbox.css";

export default function ContactInbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const { data } = await axios.get("/admin/contact-messages"); setMessages(data.submissions || []); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "Could not load contact messages.")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const updateStatus = async (id, status) => {
    setUpdating(id); setError("");
    try { const { data } = await axios.patch(`/admin/contact-messages/${id}`, { status }); setMessages((current) => current.map((message) => message._id === id ? data.submission : message)); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "Could not update this message.")); }
    finally { setUpdating(""); }
  };
  return <Layout sidebar><section className="contact-inbox-page">
    <div className="contact-inbox-heading"><div><span>STORE SUPPORT</span><h1>Contact messages</h1><p>Messages sent through the storefront contact form.</p></div><Button variant="outline-primary" onClick={load} disabled={loading}>Refresh</Button></div>
    {error && <Alert variant="danger">{error}</Alert>}
    {loading ? <div className="contact-inbox-loading"><Spinner animation="border" size="sm" /> Loading messages…</div> : messages.length === 0 ? <div className="contact-inbox-empty"><h2>No messages yet</h2><p>New Contact Us submissions will appear here.</p></div> : <div className="contact-inbox-list">{messages.map((message) => <article className="contact-inbox-message" key={message._id}>
      <div className="contact-inbox-message-head"><div><h2>{message.subject || "Customer enquiry"}</h2><span>{new Date(message.createdAt).toLocaleString("en-PK")}</span></div><Badge bg={message.status === "resolved" ? "success" : message.status === "read" ? "primary" : "warning"}>{message.status}</Badge></div>
      <div className="contact-inbox-customer"><strong>{message.name}</strong>{message.email && <a href={`mailto:${message.email}`}>{message.email}</a>}<a href={`tel:${String(message.phone).replace(/[^+\d]/g, "")}`}>{message.phone}</a></div>
      <p className="contact-inbox-body">{message.message}</p>
      <div className="contact-inbox-actions"><Form.Select aria-label={`Update status for ${message.name}`} value={message.status} disabled={updating === message._id} onChange={(event) => updateStatus(message._id, event.target.value)}><option value="new">New</option><option value="read">Read</option><option value="resolved">Resolved</option></Form.Select></div>
    </article>)}</div>}
  </section></Layout>;
}
