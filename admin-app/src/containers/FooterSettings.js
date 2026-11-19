import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Container, Form, Spinner } from "react-bootstrap";
import Layout from "../components/Layout";
import axios, { getApiErrorMessage } from "../helpers/axios";

const defaults = {
  brandName: "Subazen", description: "Shop online with Subazen in Pakistan.",
  email: "hafizahsanashfaq17@gmail.com", phone: "0300000000", address: "Karim Park, Lahore, Pakistan",
  whatsappNumber: "+923064652044",
  whatsappTemplates: [
    { label: "Ask about a product", message: "Hi Subazen Support, I’d like to know more about this product: " },
    { label: "Return or refund help", message: "Hi Subazen Support, I need help with a return or refund. My order number is: " },
    { label: "Request a custom quote", message: "Hi Subazen Support, I’d like a custom quote for this product: " },
    { label: "Other question", message: "Hi Subazen Support, I have a question: " },
  ],
  columns: [
    { title: "Shop", links: [{ label: "Browse products", url: "/" }, { label: "Search", url: "/search" }, { label: "Shopping cart", url: "/cart" }] },
    { title: "Your account", links: [{ label: "My orders", url: "/account/orders" }, { label: "Checkout", url: "/checkout" }] },
  ], socialLinks: [],
  pages: [
    { slug: "about-us", title: "About Us", content: "" },
    { slug: "privacy-policy", title: "Privacy Policy", content: "" },
    { slug: "return-policy", title: "Returns and Refunds", content: "" },
    { slug: "dmca", title: "DMCA", content: "" },
  ],
  orderingNote: "Cash on Delivery is the available payment method. Shipping charges are shown before you place an order.",
  copyrightText: "Subazen",
};

export default function FooterSettings() {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pageContentRefs = useRef({});

  useEffect(() => {
    let current = true;
    axios.get("/admin/footer")
      .then((response) => { if (current) setSettings({ ...defaults, ...response.data?.settings }); })
      .catch((requestError) => { if (current) setError(getApiErrorMessage(requestError, "Could not load footer settings.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const change = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const changeColumn = (columnIndex, key, value) => change("columns", settings.columns.map((column, index) => index === columnIndex ? { ...column, [key]: value } : column));
  const changeLink = (columnIndex, linkIndex, key, value) => change("columns", settings.columns.map((column, index) => index === columnIndex ? { ...column, links: column.links.map((link, itemIndex) => itemIndex === linkIndex ? { ...link, [key]: value } : link) } : column));
  const changeSocial = (linkIndex, key, value) => change("socialLinks", settings.socialLinks.map((link, index) => index === linkIndex ? { ...link, [key]: value } : link));
  const changePage = (pageIndex, key, value) => change("pages", settings.pages.map((page, index) => index === pageIndex ? { ...page, [key]: value } : page));
  const changeWhatsAppTemplate = (templateIndex, key, value) => change("whatsappTemplates", settings.whatsappTemplates.map((template, index) => index === templateIndex ? { ...template, [key]: value } : template));
  const insertPageMarkup = (pageIndex, pageSlug, before, after, fallback) => {
    const input = pageContentRefs.current[pageSlug];
    const content = settings.pages[pageIndex]?.content || "";
    const start = input?.selectionStart ?? content.length;
    const end = input?.selectionEnd ?? content.length;
    const selected = content.slice(start, end) || fallback;
    const replacement = `${before}${selected}${after}`;
    changePage(pageIndex, "content", `${content.slice(0, start)}${replacement}${content.slice(end)}`);
    window.requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + before.length, start + before.length + selected.length); });
  };

  const save = async (event) => {
    event.preventDefault(); setError(""); setMessage(""); setSaving(true);
    try {
      const response = await axios.put("/admin/footer", settings);
      setSettings({ ...defaults, ...response.data?.settings });
      setMessage("Footer saved and published to the storefront.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not save footer settings."));
    } finally { setSaving(false); }
  };

  return <Layout sidebar><Container fluid className="py-3 footer-settings-page">
    <div className="mb-4"><h1 className="h3 mb-1">Storefront settings</h1><p className="text-muted mb-0">Manage customer support, store contact information, and footer links. Changes publish when saved.</p></div>
    {error && <Alert variant="danger" role="alert">{error}</Alert>}
    {message && <Alert variant="success" role="status">{message}</Alert>}
    {loading ? <div><Spinner size="sm" /> Loading footer settings…</div> : <Form onSubmit={save}>
      <Card className="mb-3"><Card.Header><strong>Store information</strong></Card.Header><Card.Body className="row g-3">
        <Form.Group className="col-12 col-md-6"><Form.Label>Store name</Form.Label><Form.Control maxLength={100} value={settings.brandName} onChange={(event) => change("brandName", event.target.value)} /></Form.Group>
        <Form.Group className="col-12 col-md-6"><Form.Label>Footer description</Form.Label><Form.Control maxLength={300} value={settings.description} onChange={(event) => change("description", event.target.value)} /></Form.Group>
        <Form.Group className="col-12 col-md-6"><Form.Label>Contact email</Form.Label><Form.Control type="email" maxLength={254} value={settings.email} onChange={(event) => change("email", event.target.value)} placeholder="you@example.com" /></Form.Group>
        <Form.Group className="col-12 col-md-6"><Form.Label>Contact phone</Form.Label><Form.Control type="tel" maxLength={40} value={settings.phone} onChange={(event) => change("phone", event.target.value)} placeholder="03XXXXXXXXX" /></Form.Group>
        <Form.Group className="col-12"><Form.Label>Store address</Form.Label><Form.Control as="textarea" rows={2} maxLength={300} value={settings.address} onChange={(event) => change("address", event.target.value)} /></Form.Group>
        <Form.Group className="col-12"><Form.Label>Ordering information</Form.Label><Form.Control as="textarea" rows={2} maxLength={300} value={settings.orderingNote} onChange={(event) => change("orderingNote", event.target.value)} /></Form.Group>
        <Form.Group className="col-12 col-md-6"><Form.Label>Copyright name</Form.Label><Form.Control maxLength={160} value={settings.copyrightText} onChange={(event) => change("copyrightText", event.target.value)} /></Form.Group>
      </Card.Body></Card>

      <Card className="mb-3"><Card.Header><strong>WhatsApp customer support</strong></Card.Header><Card.Body className="row g-3">
        <Form.Group className="col-12 col-md-6"><Form.Label>WhatsApp number</Form.Label><Form.Control type="tel" maxLength={40} value={settings.whatsappNumber || ""} onChange={(event) => change("whatsappNumber", event.target.value)} placeholder="+923001234567" /><Form.Text>Include the country code. This number appears in the floating support button across the storefront.</Form.Text></Form.Group>
        <div className="col-12"><strong>Quick message templates</strong><p className="text-muted mb-2">Customers choose a topic; WhatsApp opens with the selected message ready to send.</p></div>
        {(settings.whatsappTemplates || []).map((template, index) => <div className="col-12 row g-2 align-items-end" key={`whatsapp-${index}`}>
          <Form.Group className="col-12 col-md-4"><Form.Label>Button label</Form.Label><Form.Control maxLength={80} value={template.label} onChange={(event) => changeWhatsAppTemplate(index, "label", event.target.value)} /></Form.Group>
          <Form.Group className="col-12 col-md-7"><Form.Label>Prefilled WhatsApp message</Form.Label><Form.Control as="textarea" rows={2} maxLength={1000} value={template.message} onChange={(event) => changeWhatsAppTemplate(index, "message", event.target.value)} /></Form.Group>
          <div className="col-12 col-md-1"><Button type="button" size="sm" variant="outline-danger" aria-label={`Remove ${template.label} template`} onClick={() => change("whatsappTemplates", settings.whatsappTemplates.filter((_, itemIndex) => itemIndex !== index))}>×</Button></div>
        </div>)}
        <div className="col-12"><Button type="button" size="sm" variant="outline-primary" disabled={settings.whatsappTemplates.length >= 8} onClick={() => change("whatsappTemplates", [...settings.whatsappTemplates, { label: "", message: "" }])}>Add message template</Button></div>
      </Card.Body></Card>

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2"><h2 className="h5 mb-0">Footer link columns</h2><Button type="button" variant="outline-primary" onClick={() => change("columns", [...settings.columns, { title: "", links: [] }])}>Add column</Button></div>
      {settings.columns.map((column, columnIndex) => <Card className="mb-3" key={column._id || columnIndex}><Card.Header className="d-flex align-items-center gap-2"><Form.Control aria-label="Column heading" placeholder="Column heading" maxLength={80} value={column.title} onChange={(event) => changeColumn(columnIndex, "title", event.target.value)} /><Button type="button" size="sm" variant="outline-danger" onClick={() => change("columns", settings.columns.filter((_, index) => index !== columnIndex))}>Remove column</Button></Card.Header><Card.Body>
        {column.links.map((link, linkIndex) => <div className="row g-2 align-items-end mb-2" key={link._id || linkIndex}>
          <Form.Group className="col-12 col-md-5"><Form.Label>Link label</Form.Label><Form.Control maxLength={80} value={link.label} onChange={(event) => changeLink(columnIndex, linkIndex, "label", event.target.value)} /></Form.Group>
          <Form.Group className="col-12 col-md-5"><Form.Label>Link URL</Form.Label><Form.Control maxLength={500} value={link.url} onChange={(event) => changeLink(columnIndex, linkIndex, "url", event.target.value)} placeholder="/search or https://…" /></Form.Group>
          <div className="col-12 col-md-2"><Button type="button" size="sm" variant="outline-danger" onClick={() => changeColumn(columnIndex, "links", column.links.filter((_, index) => index !== linkIndex))}>Remove</Button></div>
        </div>)}
        <Button type="button" size="sm" variant="outline-secondary" onClick={() => changeColumn(columnIndex, "links", [...column.links, { label: "", url: "" }])}>Add link</Button>
      </Card.Body></Card>)}

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2"><h2 className="h5 mb-0">Social links</h2><Button type="button" variant="outline-primary" onClick={() => change("socialLinks", [...settings.socialLinks, { label: "", url: "" }])}>Add social link</Button></div>
      {!settings.socialLinks.length && <p className="text-muted">No social links are displayed until you add them.</p>}
      {settings.socialLinks.map((link, index) => <Card className="mb-2" key={link._id || index}><Card.Body className="row g-2 align-items-end">
        <Form.Group className="col-12 col-md-5"><Form.Label>Platform or label</Form.Label><Form.Control maxLength={40} value={link.label} onChange={(event) => changeSocial(index, "label", event.target.value)} /></Form.Group>
        <Form.Group className="col-12 col-md-5"><Form.Label>Profile URL</Form.Label><Form.Control maxLength={500} value={link.url} onChange={(event) => changeSocial(index, "url", event.target.value)} placeholder="https://…" /></Form.Group>
        <div className="col-12 col-md-2"><Button type="button" size="sm" variant="outline-danger" onClick={() => change("socialLinks", settings.socialLinks.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button></div>
      </Card.Body></Card>)}
      <h2 className="h5 mt-4 mb-2">Store information pages</h2>
      <p className="text-muted">These page links appear in the storefront footer and link to one another. Edit the page text below.</p>
      {(settings.pages || defaults.pages).map((page, index) => <Card className="mb-3" key={page.slug}><Card.Body className="row g-3">
        <Form.Group className="col-12 col-md-4"><Form.Label>Page title</Form.Label><Form.Control maxLength={120} value={page.title} onChange={(event) => changePage(index, "title", event.target.value)} /></Form.Group>
        <Form.Group className="col-12"><Form.Label>{page.title} content</Form.Label><div className="d-flex flex-wrap gap-2 mb-2"><Button type="button" size="sm" variant="outline-secondary" onClick={() => insertPageMarkup(index, page.slug, "**", "**", "bold text")}>Bold</Button><Button type="button" size="sm" variant="outline-secondary" onClick={() => insertPageMarkup(index, page.slug, "[", "](https://example.com)", "link text")}>Add link</Button></div><Form.Control ref={(element) => { pageContentRefs.current[page.slug] = element; }} as="textarea" rows={7} maxLength={20000} value={page.content} onChange={(event) => changePage(index, "content", event.target.value)} placeholder="Write the information customers should see on this page." /><Form.Text>Use the buttons or Markdown: **bold text**, [link text](https://example.com), or [Contact Us](/contact). Changes appear on the public policy page after saving.</Form.Text></Form.Group>
      </Card.Body></Card>)}
      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save footer and publish"}</Button>
    </Form>}
  </Container></Layout>;
}
