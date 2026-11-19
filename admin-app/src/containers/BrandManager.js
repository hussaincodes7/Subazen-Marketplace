import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Container, Form, Row, Table } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../components/Layout";
import axios, { getApiErrorMessage } from "../helpers/axios";
import { getAllCategory } from "../actions/category.action";
import { generatePublicUrl } from "../urlConfig";
import "./BrandManager.css";

const flatten = (nodes, path = []) => nodes.flatMap((node) => {
  const nextPath = [...path, node.name];
  return [{ value: node._id, name: nextPath.join(" › "), type: node.type || "" }, ...flatten(node.children || [], nextPath)];
});
const freshForm = () => ({ name: "", categoryIds: [], displayOrder: 0, isActive: true, logo: null });

export default function BrandManager() {
  const dispatch = useDispatch();
  const categoryState = useSelector((state) => state.category);
  const categories = useMemo(() => flatten(categoryState.categories || []).filter((item) => item.type === "product"), [categoryState.categories]);
  const [brands, setBrands] = useState([]); const [form, setForm] = useState(freshForm()); const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const load = async () => { setLoading(true); try { const response = await axios.get("/admin/brands"); setBrands(response.data?.brands || []); setError(""); } catch (e) { setError(getApiErrorMessage(e, "Could not load brands.")); } finally { setLoading(false); } };
  useEffect(() => { if (!categoryState.loaded && !categoryState.loading) dispatch(getAllCategory()); load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const reset = () => { setForm(freshForm()); setEditingId(""); };
  const edit = (brand) => { setEditingId(brand._id); setForm({ name: brand.name, categoryIds: (brand.categoryIds || []).map((c) => String(c._id || c)), displayOrder: brand.displayOrder || 0, isActive: brand.isActive !== false, logo: null }); };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const data = new FormData(); data.append("name", form.name.trim()); data.append("categoryIds", JSON.stringify(form.categoryIds)); data.append("displayOrder", String(form.displayOrder)); data.append("isActive", String(form.isActive)); if (form.logo) data.append("logo", form.logo);
    try { await (editingId ? axios.put(`/admin/brands/${editingId}`, data) : axios.post("/admin/brands", data)); reset(); setNotice("Brand saved."); await load(); } catch (e) { setError(getApiErrorMessage(e, "Could not save this brand.")); } finally { setSaving(false); }
  };
  const remove = async (brand) => { if (!window.confirm(`Delete ${brand.name}? Reassign its products first.`)) return; try { await axios.delete(`/admin/brands/${brand._id}`); setNotice("Brand deleted."); await load(); } catch (e) { setError(getApiErrorMessage(e, "Could not delete this brand.")); } };
  const migrateLegacy = async () => { if (!window.confirm("Find nested leaf categories whose product names or saved brand values confirm they are brand nodes (for example, Refrigerator → Haier). Their products will be moved to the parent product type and linked to a separate brand. Original category records are kept but hidden when empty.")) return; setSaving(true); setError(""); try { const response = await axios.post("/admin/brands/migrate-legacy-categories"); setNotice(response.data?.message || "Legacy brand categories migrated."); await Promise.all([load(), dispatch(getAllCategory())]); } catch (e) { setError(getApiErrorMessage(e, "Could not migrate legacy brand categories.")); } finally { setSaving(false); } };

  return <Layout sidebar><Container fluid className="brand-manager py-3">
    <header className="align-items-start d-flex flex-wrap gap-3 justify-content-between mb-3"><div><h1 className="h3">Brands</h1><p className="text-muted mb-0">Brands are managed independently and can be assigned to one or more product types.</p></div><Button variant="outline-primary" disabled={saving} onClick={migrateLegacy}>Migrate matching legacy brands</Button></header>
    {error && <Alert variant="danger" role="alert">{error}</Alert>}{notice && <Alert variant="success" dismissible onClose={() => setNotice("")}>{notice}</Alert>}
    <Row className="g-3 align-items-start"><Col xs={12} xl={4}><Card><Card.Header>{editingId ? "Edit brand" : "Add brand"}</Card.Header><Card.Body><Form onSubmit={submit}>
      <Form.Group className="mb-3"><Form.Label>Brand name</Form.Label><Form.Control required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Haier" /></Form.Group>
      <Form.Group className="mb-3"><Form.Label>Product types</Form.Label><Form.Select required multiple value={form.categoryIds} onChange={(e) => setForm({ ...form, categoryIds: Array.from(e.target.selectedOptions, (option) => option.value) })}>{categories.map((item) => <option key={item.value} value={item.value}>{item.name}</option>)}</Form.Select><Form.Text>Select the categories where this brand should appear. Use Ctrl/⌘ for multiple selections.</Form.Text></Form.Group>
      <Form.Group className="mb-3"><Form.Label>Brand logo <span className="text-muted">(optional)</span></Form.Label>{editingId && brands.find((item) => item._id === editingId)?.logo && <img className="brand-logo-current" src={generatePublicUrl(brands.find((item) => item._id === editingId).logo)} alt="Current brand logo" />}<div className="brand-logo-guidance">320 × 160 px WebP, under 150 KB; transparent background.</div><Form.Control type="file" accept="image/svg+xml,image/webp,image/png,image/jpeg" onChange={(e) => setForm({ ...form, logo: e.target.files?.[0] || null })} /></Form.Group>
      <Row className="g-2"><Col><Form.Group className="mb-3"><Form.Label>Display order</Form.Label><Form.Control type="number" min="0" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} /></Form.Group></Col><Col className="d-flex align-items-center"><Form.Check type="switch" label="Active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /></Col></Row>
      <div className="d-flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create brand"}</Button>{editingId && <Button type="button" variant="outline-secondary" onClick={reset}>Cancel</Button>}</div>
    </Form></Card.Body></Card></Col><Col xs={12} xl={8}><Card><Card.Header className="d-flex justify-content-between"><strong>Brand directory</strong><span>{brands.length} brands</span></Card.Header><Card.Body className="p-0"><div className="table-responsive"><Table hover className="mb-0 align-middle"><thead><tr><th>Brand</th><th>Product types</th><th>Status</th><th>Order</th><th /></tr></thead><tbody>{brands.map((brand) => <tr key={brand._id}><td><div className="brand-row">{brand.logo ? <img src={generatePublicUrl(brand.logo)} alt="" /> : <span>{brand.name.slice(0, 1).toUpperCase()}</span>}<strong>{brand.name}</strong></div></td><td>{(brand.categoryIds || []).map((c) => c.name).join(", ") || "—"}</td><td>{brand.isActive === false ? "Hidden" : "Active"}</td><td>{brand.displayOrder || 0}</td><td><div className="brand-row-actions"><Button size="sm" variant="outline-primary" onClick={() => edit(brand)}>Edit</Button><Button size="sm" variant="outline-danger" onClick={() => remove(brand)}>Delete</Button></div></td></tr>)}{!loading && !brands.length && <tr><td colSpan="5" className="text-center p-4">No brands yet. Create one to show a brand tile on its product category page.</td></tr>}</tbody></Table></div>{loading && <p className="p-3 mb-0">Loading brands…</p>}</Card.Body></Card></Col></Row>
  </Container></Layout>;
}
