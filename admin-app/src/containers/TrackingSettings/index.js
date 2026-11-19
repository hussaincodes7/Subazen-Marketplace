import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Container, Form, Spinner } from "react-bootstrap";
import { FiCode, FiPlus, FiTrash2 } from "react-icons/fi";
import Layout from "../../components/Layout";
import axios, { getApiErrorMessage } from "../../helpers/axios";
import "./style.css";

const pageOptions = [
  ["home", "Homepage"], ["cart", "Shopping cart"], ["checkout", "Checkout"], ["product", "Product details"],
  ["category", "Categories and brands"], ["search", "Search results"], ["account", "Account and orders"],
  ["policy", "Information pages"], ["contact", "Contact page"], ["custom", "One exact page path"],
];
const makeEntry = () => ({ provider: "google-analytics", name: "Google Analytics", placement: "head", pages: ["all"], customPath: "", code: "", enabled: true });

export default function TrackingSettings() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let current = true;
    axios.get("/admin/tracking").then((response) => {
      if (current) setScripts((response.data?.settings?.scripts || []).map((item) => ({ ...item, pages: item.pages || ["all"] })));
    }).catch((requestError) => { if (current) setError(getApiErrorMessage(requestError, "Could not load Google tracking settings.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const update = (index, key, value) => setScripts((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const togglePage = (index, page, checked) => setScripts((items) => items.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    if (page === "all") return { ...item, pages: checked ? ["all"] : [] };
    const pages = (item.pages || []).filter((value) => value !== "all");
    return { ...item, pages: checked ? [...new Set([...pages, page])] : pages.filter((value) => value !== page) };
  }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await axios.put("/admin/tracking", { scripts });
      setScripts(response.data?.settings?.scripts || scripts);
      setMessage("Google tracking settings saved successfully and are live on the storefront.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not save Google tracking settings."));
    } finally { setSaving(false); }
  };

  return <Layout sidebar><Container fluid className="tracking-settings-page py-3">
    <header className="tracking-settings-heading"><div><span className="tracking-settings-eyebrow">STORE MEASUREMENT</span><h1>Google tracking</h1><p>Add or remove Google Analytics and Google Ads tags, choose the pages they run on, and place them in the page head or body.</p></div><FiCode aria-hidden="true" /></header>
    {error && <Alert variant="danger" role="alert">{error}</Alert>}{message && <Alert variant="success" role="status" aria-live="polite">{message}</Alert>}
    <Alert variant="info" className="tracking-settings-note"><strong>Google tags only.</strong> Paste the Google-provided snippet. Google script URLs are checked by the backend. Page targeting applies as shoppers navigate the storefront.</Alert>
    {loading ? <div className="tracking-settings-loading"><Spinner size="sm" /> Loading tracking settings…</div> : <Form onSubmit={save}>
      <div className="tracking-settings-list">{scripts.map((script, index) => <Card className="tracking-entry-card" key={script._id || `tracking-${index}`}>
        <Card.Header><div><span className="tracking-entry-index">{String(index + 1).padStart(2, "0")}</span><strong>{script.name || (script.provider === "google-ads" ? "Google Ads" : "Google Analytics")}</strong></div><Button type="button" variant="outline-danger" size="sm" onClick={() => { setScripts((items) => items.filter((_, itemIndex) => itemIndex !== index)); setMessage(""); setError(""); }}><FiTrash2 aria-hidden="true" /> Remove</Button></Card.Header>
        <Card.Body className="tracking-entry-body">
          <div className="tracking-entry-grid">
            <Form.Group><Form.Label>Google product</Form.Label><Form.Select value={script.provider} onChange={(event) => update(index, "provider", event.target.value)}><option value="google-analytics">Google Analytics</option><option value="google-ads">Google Ads</option></Form.Select></Form.Group>
            <Form.Group><Form.Label>Internal label</Form.Label><Form.Control maxLength={100} value={script.name || ""} placeholder="e.g. Analytics — all pages" onChange={(event) => update(index, "name", event.target.value)} /></Form.Group>
            <Form.Group><Form.Label>Insert snippet into</Form.Label><Form.Select value={script.placement} onChange={(event) => update(index, "placement", event.target.value)}><option value="head">Head</option><option value="body">Body</option></Form.Select></Form.Group>
          </div>
          <fieldset className="tracking-page-picker"><legend>Run on these pages</legend><label className="tracking-page-choice tracking-page-all"><input type="checkbox" checked={(script.pages || []).includes("all")} onChange={(event) => togglePage(index, "all", event.target.checked)} /> <span>All storefront pages</span></label><div className="tracking-page-options">{pageOptions.map(([value, label]) => <label key={value} className="tracking-page-choice"><input type="checkbox" checked={(script.pages || []).includes(value)} disabled={(script.pages || []).includes("all")} onChange={(event) => togglePage(index, value, event.target.checked)} /> <span>{label}</span></label>)}</div>
            {(script.pages || []).includes("custom") && <Form.Group className="mt-2"><Form.Label>Exact page path</Form.Label><Form.Control value={script.customPath || ""} placeholder="/pages/about-us" onChange={(event) => update(index, "customPath", event.target.value)} /></Form.Group>}
          </fieldset>
          <Form.Group><Form.Label>Google code snippet</Form.Label><Form.Control as="textarea" rows={8} spellCheck={false} className="tracking-code-input" value={script.code || ""} placeholder={'Paste the Google tag snippet from Analytics or Google Ads here.'} onChange={(event) => update(index, "code", event.target.value)} /><Form.Text>Do not paste credentials, API secrets, or unrelated scripts here.</Form.Text></Form.Group>
          <Form.Check type="switch" label="Tag enabled" checked={script.enabled !== false} onChange={(event) => update(index, "enabled", event.target.checked)} />
        </Card.Body>
      </Card>)}
      {!scripts.length && <div className="tracking-settings-empty"><FiCode aria-hidden="true" /><h2>No Google tags added</h2><p>Add a Google Analytics or Google Ads snippet to begin.</p></div>}
      </div>
      <div className="tracking-settings-actions"><Button type="button" variant="outline-primary" onClick={() => { setScripts((items) => [...items, makeEntry()]); setError(""); setMessage(""); }}><FiPlus aria-hidden="true" /> Add Google tag</Button><Button type="submit" disabled={saving}>{saving ? <><Spinner size="sm" /> Saving…</> : "Save tracking settings"}</Button></div>
    </Form>}
  </Container></Layout>;
}
