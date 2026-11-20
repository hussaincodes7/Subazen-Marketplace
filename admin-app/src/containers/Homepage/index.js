import React, { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Container, Form } from "react-bootstrap";
import Layout from "../../components/Layout";
import axios, { getApiErrorMessage } from "../../helpers/axios";
import { generatePublicUrl } from "../../urlConfig";
import "./style.css";

const types = ["banner", "products", "recommended", "spotlight", "categories", "text"];
const newSection = (type) => ({ type, title: "", description: "", image: "", mobileImage: "", href: "", productIds: [], spotlightCards: [], cardWidth: 200, categoryIds: [], layout: "grid", enabled: true, desktopFile: null, mobileFile: null });
const selectedValues = (event) => Array.from(event.target.selectedOptions, (option) => option.value);

export default function Homepage() {
  const [sections, setSections] = useState([]);
  const [published, setPublished] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [productSearch, setProductSearch] = useState("");
  const [spotlightProductSearch, setSpotlightProductSearch] = useState({});

  useEffect(() => {
    let current = true;
    Promise.all([axios.get("/admin/homepage"), axios.post("/initialdata", {})])
      .then(([layoutResponse, dataResponse]) => {
        if (!current) return;
        const layout = layoutResponse.data?.layout;
        setSections((layout?.sections || []).map((section) => ({ ...section, cardWidth: section.type === "spotlight" && [220, 250].includes(Number(section.cardWidth || 250)) ? 200 : section.cardWidth, desktopFile: null, mobileFile: null })));
        setPublished(layout?.published !== false);
        setProducts(dataResponse.data?.products || []);
        const flatten = (items) => items.flatMap((item) => [item, ...flatten(item.children || [])]);
        setCategories(flatten(dataResponse.data?.categories || []));
      })
      .catch((requestError) => { if (current) setError(getApiErrorMessage(requestError, "Could not load homepage editor data.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const changeSection = (index, key, value) => setSections((items) => items.map((section, itemIndex) => itemIndex === index ? { ...section, [key]: value } : section));
  const move = (index, delta) => setSections((items) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const save = async (event) => {
    event.preventDefault();
    const incompleteSpotlight = sections.find((section) => section.type === "spotlight" && (section.spotlightCards || []).some((card) => !(card.productId?._id || card.productId) || (!card.file && !card.image)));
    if (incompleteSpotlight) {
      setError("Finish every Spotlight card by selecting a product and uploading its card image.");
      setMessage("");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const form = new FormData();
    form.append("published", String(published));
    form.append("sections", JSON.stringify(sections.map(({ desktopFile, mobileFile, spotlightCards, ...section }) => ({ ...section, spotlightCards: (spotlightCards || []).map(({ file, ...card }) => ({ ...card, productId: typeof card.productId === "object" ? card.productId?._id : card.productId })), productIds: (section.productIds || []).map((item) => typeof item === "object" ? item._id : item), categoryIds: (section.categoryIds || []).map((item) => typeof item === "object" ? item._id : item) }))));
    sections.forEach((section, index) => {
      if (section.desktopFile) form.append(`sectionImage_${index}`, section.desktopFile);
      if (section.mobileFile) form.append(`sectionMobileImage_${index}`, section.mobileFile);
      (section.spotlightCards || []).forEach((card, cardIndex) => { if (card.file) form.append(`sectionSpotlightImage_${index}_${cardIndex}`, card.file); });
    });
    try {
      const response = await axios.put("/admin/homepage", form);
      setSections((response.data?.layout?.sections || []).map((section) => ({ ...section, desktopFile: null, mobileFile: null })));
      setPublished(response.data?.layout?.published !== false);
      setMessage("Success — homepage changes are saved and live on the storefront.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not save homepage layout."));
    } finally {
      setSaving(false);
    }
  };

  const previewSection = (section, index) => {
    const desktopSrc = section.desktopFile ? URL.createObjectURL(section.desktopFile) : (section.image ? generatePublicUrl(section.image) : "");
    const mobileSrc = section.mobileFile ? URL.createObjectURL(section.mobileFile) : (section.mobileImage ? generatePublicUrl(section.mobileImage) : desktopSrc);
    if (section.type === "banner") return <section className={`homepage-preview-banner ${previewDevice === "mobile" ? "is-mobile" : ""}`} key={`preview-${index}`}>
      {(previewDevice === "mobile" ? mobileSrc : desktopSrc) ? <img src={previewDevice === "mobile" ? mobileSrc : desktopSrc} alt={section.title || "Homepage banner preview"} /> : <div className="homepage-preview-banner-empty">Banner preview</div>}
      {(section.title || section.description) && <div className="homepage-preview-banner-copy">
        {section.title && <h3>{section.title}</h3>}{section.description && <p>{section.description}</p>}
      </div>}
      {previewDevice === "mobile" && !section.mobileFile && !section.mobileImage && <span className="homepage-preview-note">Using desktop image on mobile</span>}
    </section>;
    if (section.type === "spotlight") return <section className="homepage-preview-section" key={`preview-${index}`}>
      <h3>{section.title || "In The Spotlight"}</h3>
      <div className="homepage-spotlight-preview" style={{ "--spotlight-card-width": `${Math.max(140, Math.min(360, Number(section.cardWidth) || 200))}px` }}>
        {(section.spotlightCards || []).map((card, cardIndex) => { const product = products.find((item) => String(item._id) === String(card.productId?._id || card.productId)); const image = card.file ? URL.createObjectURL(card.file) : (card.image ? generatePublicUrl(card.image) : ""); return <article className="homepage-spotlight-card" key={`preview-card-${cardIndex}`}>{image ? <img src={image} alt="" /> : <div className="homepage-spotlight-empty">Card image preview</div>}<strong>{product?.name || "Choose a product"}</strong></article>; })}
      </div>
    </section>;
    return <section className="homepage-preview-section" key={`preview-${index}`}>
      {section.title && <h3>{section.title}</h3>}{section.description && <p>{section.description}</p>}
      {(section.type === "products" || section.type === "recommended") && <div className={`homepage-preview-items ${section.type === "recommended" || /recommended/i.test(section.title || "") ? "is-slider" : ""}`}>{((section.productIds || []).length ? (section.productIds || []).map((id) => products.find((item) => String(item._id) === String(typeof id === "object" ? id._id : id))).filter(Boolean) : products).map((product) => {
      const image = product.productPictures?.[product.featuredImageIndex || 0]?.img || product.productPictures?.[0]?.img;
      return <div className="homepage-preview-item" key={product._id}>{image && <img src={generatePublicUrl(image)} alt="" />}<span>{product.name}</span><small>PKR {Number(product.price || 0).toLocaleString("en-PK")}</small></div>;
    })}</div>}
      {section.type === "categories" && <div className="homepage-preview-items">{(section.categoryIds || []).map((id) => categories.find((item) => String(item._id) === String(typeof id === "object" ? id._id : id))).filter(Boolean).map((category) => <div className="homepage-preview-item" key={category._id}>{category.categoryImage && <img src={generatePublicUrl(category.categoryImage)} alt="" />}<span>{category.name}</span></div>)}</div>}
    </section>;
  };

  return <Layout sidebar><Container fluid className="py-3">
    <header className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3"><div><h1 className="h3">Homepage layout</h1><p className="text-muted mb-0">Add and arrange storefront sections. Changes are saved to the database and published.</p></div><Badge bg={published ? "success" : "secondary"}>{published ? "Published" : "Draft"}</Badge></header>
    {error && <Alert variant="danger" role="alert">{error}</Alert>}{message && <Alert variant="success" role="status" aria-live="polite">{message}</Alert>}
    {loading ? <p>Loading editor…</p> : <div className="homepage-editor-layout">
      <Form onSubmit={save}>
        <div className="homepage-add-controls d-flex flex-wrap gap-2 mb-3">
          <Button type="button" variant="primary" onClick={() => setSections((items) => [...items, { ...newSection("spotlight"), title: "In The Spotlight" }])}>Add Spotlight</Button>
          <Button type="button" variant="outline-primary" onClick={() => setSections((items) => [...items, { ...newSection("recommended"), title: "Recommended for you", layout: "slider" }])}>Add Recommended for you</Button>
          {types.filter((type) => !["products", "recommended", "spotlight"].includes(type)).map((type) => <Button key={type} type="button" variant="outline-secondary" onClick={() => setSections((items) => [...items, newSection(type)])}>Add {type} section</Button>)}
          <Form.Check className="ms-auto align-self-center" type="switch" id="homepage-published" label="Publish changes" checked={published} onChange={(event) => setPublished(event.target.checked)} />
        </div>
        {!sections.length && <div className="text-muted mb-3">No custom sections yet. The storefront will show its product catalog by default.</div>}
        {sections.map((section, index) => <Card className="mb-3" key={section._id || `section-${index}`}>
          <Card.Header className="d-flex align-items-center justify-content-between gap-2"><strong>{index + 1}. {section.type}</strong><div className="d-flex gap-1"><Button type="button" size="sm" variant="outline-secondary" disabled={!index} onClick={() => move(index, -1)}>↑</Button><Button type="button" size="sm" variant="outline-secondary" disabled={index === sections.length - 1} onClick={() => move(index, 1)}>↓</Button><Button type="button" size="sm" variant="outline-danger" onClick={() => setSections((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Delete</Button></div></Card.Header>
          <Card.Body className="homepage-section-form">
            <Form.Group><Form.Label>Heading</Form.Label><Form.Control value={section.title || ""} onChange={(event) => changeSection(index, "title", event.target.value)} /></Form.Group>
            <Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={section.description || ""} onChange={(event) => changeSection(index, "description", event.target.value)} /></Form.Group>
            {(section.type === "banner") && <>
              {(section.desktopFile || section.image) && <div className="homepage-upload-preview"><img className="homepage-image-preview" src={section.desktopFile ? URL.createObjectURL(section.desktopFile) : generatePublicUrl(section.image)} alt="Current desktop banner" /></div>}
              <Form.Group><Form.Label>Desktop banner image</Form.Label><div className="homepage-image-guidance"><strong>1170 × 360 px WebP, under 500 KB</strong></div><Form.Control type="file" accept="image/webp,image/*" onChange={(event) => changeSection(index, "desktopFile", event.target.files?.[0] || null)} />{section.image && <Button type="button" size="sm" variant="link" className="text-danger px-0" onClick={() => { changeSection(index, "image", ""); changeSection(index, "desktopFile", null); }}>Remove desktop image</Button>}</Form.Group>
              {(section.mobileFile || section.mobileImage) && <div className="homepage-upload-preview is-mobile"><img className="homepage-image-preview" src={section.mobileFile ? URL.createObjectURL(section.mobileFile) : generatePublicUrl(section.mobileImage)} alt="Current mobile banner" /></div>}
              <Form.Group><Form.Label>Mobile banner image <span className="text-muted">(optional)</span></Form.Label><div className="homepage-image-guidance"><strong>900 × 667 px WebP, under 300 KB</strong></div><Form.Control type="file" accept="image/webp,image/*" onChange={(event) => changeSection(index, "mobileFile", event.target.files?.[0] || null)} />{section.mobileImage && <Button type="button" size="sm" variant="link" className="text-danger px-0" onClick={() => { changeSection(index, "mobileImage", ""); changeSection(index, "mobileFile", null); }}>Remove mobile image</Button>}</Form.Group>
              <Form.Group><Form.Label>Banner link</Form.Label><Form.Control value={section.href || ""} placeholder="/search?q=... or a product URL" onChange={(event) => changeSection(index, "href", event.target.value)} /><Form.Text>Clicking anywhere on this banner opens this link.</Form.Text></Form.Group>
            </>}
            {(section.type === "products" || section.type === "recommended") && <>
              <Form.Group><Form.Label>Product cards and destinations</Form.Label><Form.Control type="search" className="mb-2" placeholder="Search products to add" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} /><div className="homepage-product-picker">{products.filter((product) => !productSearch.trim() || product.name.toLowerCase().includes(productSearch.trim().toLowerCase())).map((product) => { const ids = (section.productIds || []).map((item) => String(typeof item === "object" ? item._id : item)); return <Form.Check key={product._id} type="checkbox" label={`${product.name} — PKR ${Number(product.price || 0).toLocaleString("en-PK")}`} checked={ids.includes(String(product._id))} onChange={(event) => changeSection(index, "productIds", event.target.checked ? [...ids, String(product._id)] : ids.filter((id) => id !== String(product._id)))} />; })}{!products.length && <span>No products loaded yet.</span>}</div><Form.Text>Choose real products. Storefront cards link to their product pages. Use the arrows below to set the display order.</Form.Text></Form.Group>
              {(section.productIds || []).length > 0 && <div className="homepage-selected-products"><strong>Card order on storefront</strong>{section.productIds.map((item, selectedIndex) => { const id = String(typeof item === "object" ? item._id : item); const product = products.find((entry) => String(entry._id) === id); if (!product) return null; const image = product.productPictures?.[product.featuredImageIndex || 0]?.img || product.productPictures?.[0]?.img; return <div className="homepage-selected-product" key={id}>{image && <img src={generatePublicUrl(image)} alt="" />}<span>{product.name}</span><div><Button type="button" size="sm" variant="outline-secondary" aria-label={`Move ${product.name} earlier`} disabled={selectedIndex === 0} onClick={() => { const next = [...section.productIds]; [next[selectedIndex - 1], next[selectedIndex]] = [next[selectedIndex], next[selectedIndex - 1]]; changeSection(index, "productIds", next); }}>↑</Button><Button type="button" size="sm" variant="outline-secondary" aria-label={`Move ${product.name} later`} disabled={selectedIndex === section.productIds.length - 1} onClick={() => { const next = [...section.productIds]; [next[selectedIndex + 1], next[selectedIndex]] = [next[selectedIndex], next[selectedIndex + 1]]; changeSection(index, "productIds", next); }}>↓</Button></div></div>; })}</div>}
              {section.type === "products" && <Form.Group><Form.Label>Product display</Form.Label><Form.Select value={section.layout || "grid"} onChange={(event) => changeSection(index, "layout", event.target.value)}><option value="grid">Grid</option><option value="slider">Horizontal slider</option></Form.Select></Form.Group>}
            </>}
            {section.type === "spotlight" && <>
              <Form.Group><Form.Label>Card width on desktop (px)</Form.Label><Form.Control type="number" min="140" max="360" step="10" value={section.cardWidth || 200} onChange={(event) => changeSection(index, "cardWidth", Number(event.target.value))} /><Form.Text>The default card is 200 px wide. Cards scroll horizontally on phones; change this only if you want larger desktop cards.</Form.Text></Form.Group>
              <div className="homepage-spotlight-editor-heading"><strong>Spotlight cards</strong><Button type="button" size="sm" variant="outline-primary" onClick={() => changeSection(index, "spotlightCards", [...(section.spotlightCards || []), { productId: "", image: "", file: null }])}>Add card</Button></div>
              {(section.spotlightCards || []).map((card, cardIndex) => {
                const productId = String(card.productId?._id || card.productId || "");
                const selectedProduct = products.find((product) => String(product._id) === productId);
                const spotlightSearchKey = `${section._id || index}-${card._id || cardIndex}`;
                const spotlightQuery = String(spotlightProductSearch[spotlightSearchKey] || "").trim().toLowerCase();
                const visibleSpotlightProducts = products.filter((product) => {
                  if (String(product._id) === productId || !spotlightQuery) return true;
                  return [product.name, product.brand, product.slug, product.category?.name, product.brandId?.name].some((value) => String(value || "").toLowerCase().includes(spotlightQuery));
                });
                const image = card.file ? URL.createObjectURL(card.file) : (card.image ? generatePublicUrl(card.image) : "");
                const updateCard = (key, value) => changeSection(index, "spotlightCards", section.spotlightCards.map((item, itemIndex) => itemIndex === cardIndex ? { ...item, [key]: value } : item));
                const moveCard = (delta) => { const next = [...section.spotlightCards]; const target = cardIndex + delta; if (target < 0 || target >= next.length) return; [next[cardIndex], next[target]] = [next[target], next[cardIndex]]; changeSection(index, "spotlightCards", next); };
                return <div className="homepage-spotlight-editor-card" key={card._id || `spotlight-${cardIndex}`}>
                  <div className="homepage-spotlight-editor-preview">{image ? <img src={image} alt="Spotlight card preview" /> : <span>Upload a card image</span>}</div>
                  <Form.Group><Form.Label>Link to product</Form.Label><Form.Control className="mb-2" type="search" value={spotlightProductSearch[spotlightSearchKey] || ""} placeholder="Search by product, brand, or category" onChange={(event) => setSpotlightProductSearch((current) => ({ ...current, [spotlightSearchKey]: event.target.value }))} /><Form.Select value={productId} onChange={(event) => updateCard("productId", event.target.value)}><option value="">Select a product</option>{visibleSpotlightProducts.map((product) => <option key={product._id} value={product._id}>{product.name}{product.brand ? ` — ${product.brand}` : ""} — PKR ${Number(product.price || 0).toLocaleString("en-PK")}</option>)}</Form.Select>{selectedProduct && <Form.Text>Customers will open: {selectedProduct.name}</Form.Text>}{spotlightQuery && visibleSpotlightProducts.length === 0 && <Form.Text>No matching products. Try a shorter name.</Form.Text>}</Form.Group>
                  <Form.Group><Form.Label>Card artwork</Form.Label><div className="homepage-image-guidance"><strong>Recommended: 750 × 500 px (3:2), WebP, under 300 KB.</strong><span>The storefront crops to a 3:2 card. Keep text and important artwork away from the edges.</span></div><Form.Control type="file" accept="image/webp,image/*" onChange={(event) => updateCard("file", event.target.files?.[0] || null)} />{card.image && <Button type="button" size="sm" variant="link" className="text-danger px-0" onClick={() => { updateCard("image", ""); updateCard("file", null); }}>Remove image</Button>}</Form.Group>
                  <div className="homepage-spotlight-card-actions"><Button type="button" size="sm" variant="outline-secondary" disabled={cardIndex === 0} onClick={() => moveCard(-1)}>↑</Button><Button type="button" size="sm" variant="outline-secondary" disabled={cardIndex === section.spotlightCards.length - 1} onClick={() => moveCard(1)}>↓</Button><Button type="button" size="sm" variant="outline-danger" onClick={() => changeSection(index, "spotlightCards", section.spotlightCards.filter((_, itemIndex) => itemIndex !== cardIndex))}>Delete card</Button></div>
                </div>;
              })}
              {!section.spotlightCards?.length && <p className="text-muted mb-0">Add image cards and link each one to a real product.</p>}
            </>}
            {section.type === "categories" && <Form.Group><Form.Label>Categories</Form.Label><Form.Select multiple value={(section.categoryIds || []).map((item) => String(typeof item === "object" ? item._id : item))} onChange={(event) => changeSection(index, "categoryIds", selectedValues(event))}>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</Form.Select></Form.Group>}
            <Form.Check type="switch" label="Show this section" checked={section.enabled !== false} onChange={(event) => changeSection(index, "enabled", event.target.checked)} />
          </Card.Body>
        </Card>)}
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save and publish homepage"}</Button>
      </Form>
      <aside className="homepage-preview"><div className="homepage-preview-heading"><div><h2 className="h5 mb-1">Responsive storefront preview</h2><p className="small text-muted mb-0">Preview banners, chosen product cards, images and section order.</p></div><div className="btn-group btn-group-sm" role="group" aria-label="Preview size"><Button type="button" variant={previewDevice === "desktop" ? "primary" : "outline-secondary"} onClick={() => setPreviewDevice("desktop")}>Desktop</Button><Button type="button" variant={previewDevice === "mobile" ? "primary" : "outline-secondary"} onClick={() => setPreviewDevice("mobile")}>Mobile</Button></div></div><div className={`homepage-preview-frame ${previewDevice === "mobile" ? "is-mobile" : ""}`}><div className="homepage-preview-store-header"><strong>Subazen</strong><span>Search products, brands and categories</span><b>Account　 Cart</b></div>{sections.filter((section) => section.enabled !== false).length ? sections.filter((section) => section.enabled !== false).map(previewSection) : <section className="homepage-preview-section"><h3>Available products</h3><div className="homepage-preview-items">{products.map((product) => { const image = product.productPictures?.[product.featuredImageIndex || 0]?.img || product.productPictures?.[0]?.img; return <div className="homepage-preview-item" key={product._id}>{image && <img src={generatePublicUrl(image)} alt="" />}<span>{product.name}</span><small>PKR {Number(product.price || 0).toLocaleString("en-PK")}</small></div>; })}</div></section>}</div></aside>
    </div>}
  </Container></Layout>;
}
