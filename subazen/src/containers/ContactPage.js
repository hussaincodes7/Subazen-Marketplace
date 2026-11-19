import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import axios from "../helpers/axios";
import usePageMeta from "../hooks/usePageMeta";
import "./ContactPage.css";

const initialForm = { name: "", email: "", phone: "", subject: "", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState(initialForm);
  const [contact, setContact] = useState({ email: "", phone: "", address: "" });
  const [status, setStatus] = useState({ kind: "", text: "" });
  const [sending, setSending] = useState(false);
  usePageMeta({ title: "Contact Us | Subazen", description: "Contact Subazen customer support in Pakistan.", canonical: `${window.location.origin}/contact` });

  useEffect(() => {
    let current = true;
    axios.get("/footer").then(({ data }) => { if (current) setContact(data.settings || {}); }).catch(() => {});
    return () => { current = false; };
  }, []);

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setStatus({ kind: "", text: "" }); setSending(true);
    try {
      const { data } = await axios.post("/contact", form);
      setStatus({ kind: "success", text: data.message || "Thanks for contacting Subazen. Our team has received your message." });
      setForm(initialForm);
    } catch (error) {
      setStatus({ kind: "error", text: error.response?.data?.message || "We couldn’t send your message. Please try again." });
    } finally { setSending(false); }
  };

  return <Layout><main className="contact-page">
    <header className="contact-page-heading"><span>WE’RE HERE TO HELP</span><h1>Contact Subazen</h1><p>Send our team a message and we’ll get back to you as soon as we can.</p></header>
    <div className="contact-page-layout">
      <form className="contact-form" onSubmit={submit}>
        <label>Full name<input autoComplete="name" name="name" maxLength={120} required value={form.name} onChange={change} placeholder="e.g. Ali Khan" /></label>
        <div className="contact-form-row">
          <label>Email address <span>(optional)</span><input autoComplete="email" type="email" name="email" maxLength={254} value={form.email} onChange={change} placeholder="e.g. ali@example.com" /></label>
          <label>Phone number<input autoComplete="tel" type="tel" name="phone" maxLength={24} required value={form.phone} onChange={change} placeholder="e.g. 03001234567" /></label>
        </div>
        <label>Subject <span>(optional)</span><input name="subject" maxLength={160} value={form.subject} onChange={change} placeholder="e.g. Question about an order" /></label>
        <label>How can we help?<textarea name="message" rows={6} minLength={5} maxLength={5000} required value={form.message} onChange={change} placeholder="Describe your question. Include an order number if relevant." /></label>
        {status.text && <p className={`contact-form-message is-${status.kind}`} role={status.kind === "error" ? "alert" : "status"}>{status.text}</p>}
        <button type="submit" disabled={sending}>{sending ? "Sending…" : "Send message"}</button>
      </form>
      <aside className="contact-details"><h2>Customer support</h2>{contact.address && <p><strong>Address</strong><span>{contact.address}</span></p>}{contact.email && <p><strong>Email</strong><a href={`mailto:${contact.email}`}>{contact.email}</a></p>}{contact.phone && <p><strong>Phone</strong><a href={`tel:${String(contact.phone).replace(/[^+\d]/g, "")}`}>{contact.phone}</a></p>}</aside>
    </div>
  </main></Layout>;
}
