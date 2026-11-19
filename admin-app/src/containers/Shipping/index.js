import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Container, Form, Spinner } from "react-bootstrap";
import Layout from "../../components/Layout";
import axios, { getApiErrorMessage } from "../../helpers/axios";

const blankRule = () => ({ city: "", area: "", fee: "", free: false });

export default function Shipping() {
  const [defaultFee, setDefaultFee] = useState("250");
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let current = true;
    axios.get("/admin/shipping")
      .then((response) => {
        if (!current) return;
        setDefaultFee(String(response.data?.config?.defaultFee ?? 250));
        setRules((response.data?.config?.rules || []).map((rule) => ({ ...rule, fee: String(rule.fee) })));
      })
      .catch((requestError) => { if (current) setError(getApiErrorMessage(requestError, "Could not load shipping settings.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const updateRule = (index, key, value) => setRules((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await axios.put("/admin/shipping", {
        defaultFee: Number(defaultFee),
        rules: rules.map((rule) => ({ city: rule.city.trim(), area: rule.area.trim(), fee: Number(rule.fee), free: Boolean(rule.free) })),
      });
      setDefaultFee(String(response.data.config.defaultFee));
      setRules((response.data.config.rules || []).map((rule) => ({ ...rule, fee: String(rule.fee) })));
      setMessage("Shipping settings saved.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not save shipping settings."));
    } finally {
      setSaving(false);
    }
  };

  return <Layout sidebar><Container fluid className="py-3">
    <h1 className="h3">Shipping fees</h1>
    <p className="text-muted">These fees are calculated by the server and saved with each order.</p>
    {error && <Alert variant="danger">{error}</Alert>}
    {message && <Alert variant="success">{message}</Alert>}
    {loading ? <div><Spinner size="sm" /> Loading shipping settings…</div> : <Form onSubmit={save}>
      <Card className="mb-3"><Card.Body>
        <Form.Group>
          <Form.Label>Default shipping fee (PKR)</Form.Label>
          <Form.Control required type="number" min="0" step="1" value={defaultFee} onChange={(event) => setDefaultFee(event.target.value)} />
        </Form.Group>
      </Card.Body></Card>
      <div className="d-flex align-items-center justify-content-between mb-2"><h2 className="h5 mb-0">City and area rules</h2><Button type="button" variant="outline-primary" onClick={() => setRules((items) => [...items, blankRule()])}>Add rule</Button></div>
      {!rules.length && <p className="text-muted">No location rules. The default fee applies everywhere.</p>}
      {rules.map((rule, index) => <Card className="mb-2" key={rule._id || index}><Card.Body className="d-grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", alignItems: "end" }}>
        <Form.Group><Form.Label>City (blank = any)</Form.Label><Form.Control value={rule.city} onChange={(event) => updateRule(index, "city", event.target.value)} /></Form.Group>
        <Form.Group><Form.Label>Area contains (optional)</Form.Label><Form.Control value={rule.area} onChange={(event) => updateRule(index, "area", event.target.value)} /></Form.Group>
        <Form.Group><Form.Label>Fee (PKR)</Form.Label><Form.Control required type="number" min="0" step="1" disabled={rule.free} value={rule.fee} onChange={(event) => updateRule(index, "fee", event.target.value)} /></Form.Group>
        <Form.Check label="Free shipping" checked={rule.free} onChange={(event) => updateRule(index, "free", event.target.checked)} />
        <Button type="button" variant="outline-danger" onClick={() => setRules((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
      </Card.Body></Card>)}
      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save shipping settings"}</Button>
    </Form>}
  </Container></Layout>;
}
