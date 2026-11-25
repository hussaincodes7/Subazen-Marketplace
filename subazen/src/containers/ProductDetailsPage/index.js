import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiZoomIn } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { getProductDetailsById, getProductDetailsBySlug, addToCart } from "../../actions";
import Layout from "../../components/Layout";
import Price from "../../components/UI/Price";
import { MaterialButton } from "../../components/MaterialUI";
import { generatePublicUrl } from "../../urlConfig";
import usePageMeta from "../../hooks/usePageMeta";
import axios from "../../helpers/axios";
import ProductCard from "../../components/UI/ProductCard";
import "./style.css";

const formatSizeLabel = (value) => ({
  xs: "XS", s: "S", m: "M", l: "L", xl: "XL", xxl: "XXL", xxxl: "XXXL",
})[String(value || "").trim().toLowerCase()] || value;
const renderDescriptionInline = (value, keyPrefix) => String(value).split(/(\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/[^)]+|\/[^)]*)\))/g).filter(Boolean).map((part, index) => {
  const key = `${keyPrefix}-${index}`;
  if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
  const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]*)\)$/);
  if (link) return <a key={key} href={link[2]} target={link[2].startsWith("http") ? "_blank" : undefined} rel={link[2].startsWith("http") ? "noopener noreferrer" : undefined}>{link[1]}</a>;
  return part;
});
const renderProductDescription = (value) => {
  const lines = String(value || "").split(/\r?\n/);
  const blocks = [];
  let bullets = [];
  const flushBullets = () => { if (bullets.length) { blocks.push(<ul key={`list-${blocks.length}`}>{bullets.map((line, index) => <li key={index}>{renderDescriptionInline(line, `li-${blocks.length}-${index}`)}</li>)}</ul>); bullets = []; } };
  lines.forEach((line, index) => {
    if (/^\s*[-*]\s+/.test(line)) bullets.push(line.replace(/^\s*[-*]\s+/, ""));
    else { flushBullets(); if (line.trim()) blocks.push(<p key={`p-${index}`}>{renderDescriptionInline(line, `p-${index}`)}</p>); }
  });
  flushBullets();
  return blocks;
};

const ProductDetailsPage = (props) => {
  const dispatch = useDispatch();
  const state = useSelector((store) => store.product);
  const cart = useSelector((store) => store.cart);
  const auth = useSelector((store) => store.auth);
  const product = state.productDetails || {};
  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState("");
  const [printPlacement, setPrintPlacement] = useState("");
  const [customOptionSelections, setCustomOptionSelections] = useState({});
  const [designFiles, setDesignFiles] = useState({ front: null, back: null });
  const [designInstructions, setDesignInstructions] = useState("");
  const [designError, setDesignError] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [designUploading, setDesignUploading] = useState(false);
  const [designPreviewUrls, setDesignPreviewUrls] = useState({ front: "", back: "" });
  const selectDesignFile = (side, file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) && !/\.pdf$/i.test(file.name)) { setDesignError("Choose a JPG, PNG, WebP, or PDF file."); return; }
    if (file.size > 10 * 1024 * 1024) { setDesignError("Artwork must be 10 MB or smaller."); return; }
    setDesignFiles((current) => ({ ...current, [side]: file }));
    setDesignError("");
  };
  const [imageIndex, setImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomCloseRef = useRef(null);
  const mainImageButtonRef = useRef(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviewData, setReviewData] = useState({ enabled: true, reviews: [], averageRating: 0, reviewCount: 0, canReview: false });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [activeDetail, setActiveDetail] = useState("");
  const [readModal, setReadModal] = useState(null);
  const colors = product.colors || [];
  const variant = colors[colorIndex] || null;
  const mainPictures = product.productPictures || [];
  const variantPictures = variant?.productPictures || [];
  // A selected color owns its gallery. The admin copies main images into that
  // color only when "Use the main product images" is enabled.
  const pictures = variant ? (variantPictures.length ? variantPictures : colorIndex === 0 ? mainPictures : []) : mainPictures;
  const basePrice = Number(variant?.price ?? product.price ?? 0);
  const discountPercent = product.discountEnabled && Number(product.offer) > 0 && Number(product.offer) < 100 ? Number(product.offer) : 0;
  const price = discountPercent ? Math.round(basePrice * (100 - discountPercent) / 100) : basePrice;
  const categoryTrail = product.categoryPath || (product.category?.name ? [product.category] : []);
  const isCustomPrintingCategory = categoryTrail.some((item) => [item.name, item.slug].some((value) => ["printingandcustomproducts", "printingcustomproducts", "photocopyandxeroxservices", "photocopyxeroxservices"].includes(String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase())));
  const requiresCustomerDesign = product.requiresCustomerDesign === true;
  const allowDesignInstructions = product.allowDesignInstructions === true;
  const configuredPrintOptions = (product.customPrintOptions || []).filter((option) => option.isAvailable !== false);
  // Placement prices are final product prices, not add-on printing fees.
  const printOptions = isCustomPrintingCategory ? configuredPrintOptions : [];
  const legacyOptionGroups = Object.values((product.specifications || []).reduce((groups, item) => {
    const name = String(item.name || "").trim();
    const value = String(item.value || "").trim();
    if (!name || !value) return groups;
    const key = name.toLowerCase();
    if (!groups[key]) groups[key] = { name, options: [] };
    groups[key].options.push({ value });
    return groups;
  }, {}));
  const customProductOptions = isCustomPrintingCategory ? ((product.customProductOptions || []).length ? product.customProductOptions : legacyOptionGroups) : [];
  const selectedPrintOption = printOptions.find((option) => option.placement === printPlacement);
  const selectedProductOptionSelections = customProductOptions.map((group, index) => {
    const value = customOptionSelections[index] || "";
    const option = (group.options || []).find((choice) => choice.value === value);
    return option ? { name: group.name, value: option.value, price: Number(option.price || 0) } : null;
  }).filter(Boolean);
  const missingCustomProductOption = customProductOptions.find((group, index) => !customOptionSelections[index]);
  const customOptionsPrice = selectedProductOptionSelections.reduce((sum, option) => sum + option.price, 0);
  const displayPrice = (selectedPrintOption ? Number(selectedPrintOption.price) : price) + customOptionsPrice;
  const sizeOptions = variant?.sizes?.length ? variant.sizes : (!variant ? product.sizes || [] : []);
  const availableSizeOptions = sizeOptions.filter((item) => Number(item.quantity) > 0);
  const selectedSize = sizeOptions.find((item) => item.size === size);
  const availableStock = sizeOptions.length ? Number(selectedSize?.quantity || 0) : Number(variant?.quantity ?? product.quantity ?? 0);
  const minOrderQuantity = Math.max(1, Number(product.minOrderQuantity) || 1);
  const sizeRequired = Boolean(sizeOptions.length && !selectedSize);
  const productOutOfStock = sizeOptions.length ? availableSizeOptions.length === 0 : availableStock <= 0;
  const imageUrl = (image) => generatePublicUrl(image?.img || "");
  const description = (product.description || "Shop quality products with Cash on Delivery across Pakistan.").slice(0, 160);
  const canonical = `${window.location.origin}${props.location?.pathname || window.location.pathname}`;
  const schema = useMemo(() => product._id ? [{
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: String(product._id),
    brand: (product.brandId?.name || product.brand) ? { "@type": "Brand", name: product.brandId?.name || product.brand } : undefined,
    url: canonical,
    mainEntityOfPage: canonical,
    image: [...(product.productPictures || []), ...colors.flatMap((item) => item.productPictures || [])].map(imageUrl).filter(Boolean),
    color: colors.map((item) => item.colorName),
    ...(reviewData.reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviewData.averageRating, reviewCount: reviewData.reviewCount } } : {}),
    offers: { "@type": "Offer", priceCurrency: "PKR", price: Number(price || 0), availability: Number(availableStock) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: canonical },
    hasVariant: colors.map((item) => ({
      "@type": "Product",
      name: `${product.name} - ${item.colorName}`,
      color: item.colorName,
      image: (item.productPictures || []).map(imageUrl).filter(Boolean),
      offers: { "@type": "Offer", priceCurrency: "PKR", price: Math.round(Number(item.price ?? product.price) * (discountPercent ? (100 - discountPercent) / 100 : 1)), availability: (item.sizes?.length ? item.sizes.some((sizeOption) => Number(sizeOption.quantity) > 0) : Number(item.quantity ?? product.quantity) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: canonical },
    })),
  }, {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${window.location.origin}/` },
      ...(product.categoryPath || (product.category?.name ? [product.category] : [])).map((item, index) => ({ "@type": "ListItem", position: index + 2, name: item.name, item: `${window.location.origin}/collections/${(product.categoryPath || [product.category]).slice(0, index + 1).map((node) => node.slug).join("/")}` })),
      { "@type": "ListItem", position: (product.categoryPath || (product.category?.name ? [product.category] : [])).length + 2, name: product.name, item: canonical },
    ],
  }] : null, [product._id, product.name, product.description, product.brand, product.brandId, product.productPictures, product.quantity, product.category, product.categoryPath, colors, price, discountPercent, availableStock, canonical, reviewData.reviewCount, reviewData.averageRating]);
  usePageMeta({ title: product.name ? `${product.name} | Subazen` : "Product | Subazen", description, canonical, schema, image: imageUrl(pictures[colorIndex === 0 ? (variant?.featuredImageIndex || product.featuredImageIndex || 0) : (variant?.featuredImageIndex || 0)]) || imageUrl(pictures[0]) });

  useEffect(() => {
    if (props.match.params.productId) dispatch(getProductDetailsById({ params: { productId: props.match.params.productId } }));
    else dispatch(getProductDetailsBySlug(props.match.params.productSlug));
  }, [dispatch, props.match.params.productId, props.match.params.productSlug]);
  useEffect(() => {
    if (props.match.params.productId && String(product._id) === String(props.match.params.productId) && product.slug && props.location.pathname.endsWith("/p")) {
      props.history.replace(`/products/${product.slug}`);
    }
  }, [product._id, product.slug, props.history, props.location.pathname, props.match.params.productId]);
  useEffect(() => { setColorIndex(0); setImageIndex(0); setSize(""); setPrintPlacement(""); setCustomOptionSelections({}); setZoomOpen(false); setDesignFiles({ front: null, back: null }); setDesignInstructions(""); setDesignError(""); setSelectionError(""); }, [product._id]);
  useEffect(() => {
    const urls = {};
    Object.entries(designFiles).forEach(([side, file]) => { if (file) urls[side] = URL.createObjectURL(file); });
    setDesignPreviewUrls({ front: urls.front || "", back: urls.back || "" });
    return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
  }, [designFiles]);
  useEffect(() => { setImageIndex(0); setSize(""); }, [colorIndex]);
  useEffect(() => {
    let current = true;
    if (!product._id) return () => { current = false; };
    axios.get(`/product/${product._id}/recommendations`)
      .then((response) => { if (current) setRelatedProducts(response.data?.products || []); })
      .catch(() => { if (current) setRelatedProducts([]); });
    return () => { current = false; };
  }, [product._id]);
  useEffect(() => {
    let current = true;
    if (!product._id) return () => { current = false; };
    setReviewsLoading(true);
    axios.get(`/product/${product._id}/reviews`)
      .then((response) => { if (current) setReviewData(response.data || { enabled: true, reviews: [], canReview: false }); })
      .catch(() => { if (current) setReviewData({ enabled: product.reviewsEnabled !== false, reviews: [], averageRating: 0, reviewCount: 0, canReview: false }); })
      .finally(() => { if (current) setReviewsLoading(false); });
    return () => { current = false; };
  }, [product._id, product.reviewsEnabled, auth.authenticate]);
  useEffect(() => {
    if (!zoomOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    zoomCloseRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setZoomOpen(false);
      if (event.key === "ArrowRight" && pictures.length > 1) setImageIndex((index) => (index + 1) % pictures.length);
      if (event.key === "ArrowLeft" && pictures.length > 1) setImageIndex((index) => (index - 1 + pictures.length) % pictures.length);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      mainImageButtonRef.current?.focus();
    };
  }, [zoomOpen, pictures.length]);
  useEffect(() => {
    if (!readModal) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setReadModal(null); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [readModal]);

  if (state.loading && !product._id) return <Layout><main className="product-page-state">Loading product…</main></Layout>;
  if (!product._id) return <Layout><main className="product-page-state">Product not found. <a href="/">Return to Subazen</a></main></Layout>;
  const addSelected = async () => {
    if (sizeRequired) { setSelectionError("Choose an available size to continue."); document.querySelector("#product-size-select")?.focus(); return; }
    if (printOptions.length > 0 && !selectedPrintOption) { setSelectionError("Choose front, back, or front and back printing."); document.querySelector("#product-print-select")?.focus(); return; }
    if (missingCustomProductOption) { setSelectionError(`Choose an option for ${missingCustomProductOption.name}.`); document.querySelector(`[data-custom-option="${customProductOptions.indexOf(missingCustomProductOption)}"]`)?.focus(); return; }
    if (Number(availableStock) < minOrderQuantity) { setSelectionError(`This product requires at least ${minOrderQuantity} units, but only ${availableStock} are available.`); return; }
    setSelectionError("");
    setDesignError("");
    let designImage = "";
    let designImageFront = "";
    let designImageBack = "";
    if (requiresCustomerDesign) {
      const requiredSides = printPlacement === "front-and-back" ? ["front", "back"] : [printPlacement === "back" ? "back" : "front"];
      const missingSide = requiredSides.find((side) => !designFiles[side]);
      if (missingSide) { setDesignError(`Please upload the artwork for the ${missingSide}.`); document.querySelector(`#artwork-${missingSide}`)?.focus(); return; }
      setDesignUploading(true);
      try {
        for (const side of requiredSides) {
          const formData = new FormData();
          formData.append("design", designFiles[side]);
          const response = await axios.post(`/product/${product._id}/customer-design?side=${side}`, formData);
          const uploaded = response.data?.designImage || "";
          if (!uploaded) throw new Error(`The ${side} artwork upload did not return a saved image.`);
          if (side === "front") designImageFront = uploaded;
          if (side === "back") designImageBack = uploaded;
        }
        designImage = designImageFront || designImageBack;
      } catch (error) {
        setDesignError(error.response?.data?.message || error.message || "Could not upload your design. Please try again.");
        setDesignUploading(false);
        return;
      }
    }
    const entry = { _id: product._id, name: product.name, price: displayPrice, img: imageUrl(pictures[0]), variantId: variant?._id || "", colorName: variant?.colorName || "", colorCode: variant?.colorCode || "", size, printPlacement, productOptionSelections: selectedProductOptionSelections, stock: availableStock, minOrderQuantity, designImage, designImageFront, designImageBack, designInstructions: allowDesignInstructions ? designInstructions.trim() : "" };
    const added = await dispatch(addToCart(entry));
    setDesignUploading(false);
    if (added) props.history.push("/cart");
  };
  const submitReview = async (event) => {
    event.preventDefault(); setReviewError(""); setReviewMessage(""); setReviewSubmitting(true);
    try {
      const response = await axios.post(`/product/${product._id}/reviews`, { rating: reviewRating, title: reviewTitle, body: reviewBody });
      setReviewMessage(response.data?.message || "Your review was sent for moderation.");
      setReviewData((current) => ({ ...current, canReview: false }));
      setReviewTitle(""); setReviewBody(""); setReviewRating(5);
    } catch (error) {
      setReviewError(error.response?.data?.message || "Could not submit your review. Please try again.");
    } finally { setReviewSubmitting(false); }
  };

  const detailTabs = [
    ...(product.specifications?.length ? [{ id: "specifications", label: "Specifications" }] : []),
    ...(product.description ? [{ id: "description", label: "Description" }] : []),
    ...(product.warranty?.trim() ? [{ id: "warranty", label: "Warranty" }] : []),
  ];
  const selectedDetail = detailTabs.find((tab) => tab.id === activeDetail) || detailTabs[0];

  return <Layout>
    <main className="product-details-page">
      <nav className="product-breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a>{(product.categoryPath || (product.category?.name ? [product.category] : [])).map((item, index, path) => <React.Fragment key={item._id || item.slug}><span>›</span><a href={`/collections/${path.slice(0, index + 1).map((node) => node.slug).join("/")}`}>{item.name}</a></React.Fragment>)}<span>›</span><span>{product.name}</span></nav>
      <div className="product-details-layout">
        <div className="product-gallery">
          <div className="product-thumbnails">{pictures.map((picture, index) => <button type="button" key={`${picture.img}-${index}`} className={imageIndex === index ? "active" : ""} onClick={() => setImageIndex(index)} aria-label={`View image ${index + 1}`}><img src={imageUrl(picture)} alt={`${product.name} ${index + 1}`} loading={index > 2 ? "lazy" : "eager"} /></button>)}</div>
          <button ref={mainImageButtonRef} type="button" className="product-main-image" onClick={() => pictures[imageIndex] && setZoomOpen(true)} aria-label="Enlarge product image">{pictures[imageIndex] ? <><img src={imageUrl(pictures[imageIndex])} alt={product.name} /><span className="product-image-zoom-hint" aria-hidden="true"><FiZoomIn /></span></> : <span>Image unavailable</span>}</button>
        </div>
        <section className="product-purchase-info">
          <h1>{product.name}</h1>{productOutOfStock && <p className="product-stock">Out of stock</p>}
          {product.dealEnabled && product.dealLabel?.trim() && <div className="product-deal-badge">{product.dealLabel}</div>}
          <div className="product-current-price"><Price value={displayPrice} fontSize="1.75rem" />{!selectedPrintOption && discountPercent > 0 && <div className="product-price-meta"><del>Rs. {basePrice.toLocaleString("en-PK")}</del><span>{discountPercent}% off</span></div>}</div>
          <p className="product-minimum-order">Minimum order: <strong>{minOrderQuantity} {minOrderQuantity === 1 ? "unit" : "units"}</strong></p>
          {colors.length > 0 && <fieldset className="product-option-group"><legend>Color: {variant?.colorName}</legend><div className="product-color-options">{colors.map((color, index) => <button type="button" key={color._id || index} className={index === colorIndex ? "selected" : ""} aria-label={color.colorName} aria-pressed={index === colorIndex} onClick={() => { setColorIndex(index); setImageIndex(0); setSize(""); setZoomOpen(false); setSelectionError(""); }}><span style={{ backgroundColor: color.colorCode }} />{color.colorName}</button>)}</div></fieldset>}
          <div className="product-option-selectors">
          {sizeOptions.length > 0 && <label className="product-option-group">Size<select id="product-size-select" className={selectionError && sizeRequired ? "needs-selection" : ""} value={size} onChange={(event) => { setSize(event.target.value); setSelectionError(""); }} disabled={!availableSizeOptions.length}><option value="">{availableSizeOptions.length ? "Select size" : "No sizes available"}</option>{sizeOptions.map((item) => {
            const inStock = Number(item.quantity) > 0;
            return <option key={item._id || item.size} value={item.size} disabled={!inStock}>{formatSizeLabel(item.size)}{inStock ? "" : " — Out of stock"}</option>;
          })}</select></label>}
          {printOptions.length > 0 && <label className="product-option-group">Print side<select id="product-print-select" className={selectionError && !selectedPrintOption ? "needs-selection" : ""} value={printPlacement} onChange={(event) => { setPrintPlacement(event.target.value); setSelectionError(""); }}><option value="">Select print side</option>{printOptions.map((option) => <option key={option.placement} value={option.placement}>{option.placement === "front-and-back" ? "Front and back" : `${option.placement[0].toUpperCase()}${option.placement.slice(1)}`} · Rs. {Number(option.price || 0).toLocaleString("en-PK")}</option>)}</select></label>}
          {customProductOptions.map((group, index) => <label className="product-option-group" key={`${group.name}-${index}`}>{group.name}<select data-custom-option={index} className={selectionError && !customOptionSelections[index] ? "needs-selection" : ""} value={customOptionSelections[index] || ""} onChange={(event) => { setCustomOptionSelections((current) => ({ ...current, [index]: event.target.value })); setSelectionError(""); }}><option value="">Select {group.name.toLowerCase()}</option>{(group.options || []).map((option, choiceIndex) => <option key={`${option.value}-${choiceIndex}`} value={option.value}>{option.value}{option.price !== undefined && option.price !== null && option.price !== "" ? ` · +Rs. ${Number(option.price).toLocaleString("en-PK")}` : ""}</option>)}</select></label>)}
          </div>
          {selectionError && <p className="product-cart-error" role="alert">{selectionError}</p>}
          {requiresCustomerDesign && <section className="product-custom-design" aria-labelledby="custom-design-title">
            <h2 id="custom-design-title">Add files for your order</h2>
            {product.customDesignGuidelines?.trim() && <><p className={`product-design-guidelines ${product.customDesignGuidelines.length > 260 ? "product-detail-value-preview" : ""}`}>{product.customDesignGuidelines}</p>{product.customDesignGuidelines.length > 260 && <button type="button" className="product-description-read-button" onClick={() => setReadModal({ title: "Additional product information", text: product.customDesignGuidelines })}>Read full text</button>}</>}
            <p>Upload the files needed for this order. JPG, PNG, WebP, or PDF, up to 10 MB.</p>
            {(printPlacement === "front-and-back" ? ["front", "back"] : [printPlacement === "back" ? "back" : "front"]).map((side) => <div className="product-design-side" key={side}>
              <label className="product-design-upload" htmlFor={`artwork-${side}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectDesignFile(side, event.dataTransfer.files?.[0]); }}>Drop a file for {side} here or choose a file <span className="required-label">Required</span><input id={`artwork-${side}`} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" aria-invalid={Boolean(designError && !designFiles[side])} onChange={(event) => selectDesignFile(side, event.target.files?.[0])} /></label>
              {designFiles[side] && <div className="product-design-selected">{designFiles[side].type === "application/pdf" || /\.pdf$/i.test(designFiles[side].name) ? <span className="product-design-pdf" aria-label="PDF artwork">PDF</span> : <img src={designPreviewUrls[side]} alt={`Preview of artwork for ${side}`} />}<span>{designFiles[side].name}</span><button type="button" onClick={() => setDesignFiles((current) => ({ ...current, [side]: null }))}>Remove</button></div>}
            </div>)}
            {allowDesignInstructions && <label className="product-design-instructions">Additional instructions (optional)<textarea maxLength={1000} rows={3} value={designInstructions} onChange={(event) => setDesignInstructions(event.target.value)} placeholder="Share any details needed to fulfill this order" /></label>}
            {designError && <p className="product-cart-error" role="alert">{designError}</p>}
          </section>}
          <div className="product-detail-actions"><MaterialButton title={designUploading ? "UPLOADING FILES…" : "ADD TO CART"} onClick={addSelected} bgColor="#ff6b1b" textColor="#fff" disabled={designUploading || productOutOfStock || cart.updatingCart} /></div>
          {cart.error && !/invalid or expired token/i.test(cart.error) && <p className="product-cart-error" role="alert">{cart.error}</p>}
          <div className="product-cod-note">Cash on Delivery available. Shipping fee is shown at checkout.</div>
          {detailTabs.length > 0 && <section className="product-all-details">
            <h2>Product details</h2>
            <div className="product-detail-tabs" role="tablist" aria-label="Product information">{detailTabs.map((tab) => <button type="button" role="tab" aria-selected={selectedDetail?.id === tab.id} className={selectedDetail?.id === tab.id ? "active" : ""} key={tab.id} onClick={() => setActiveDetail(tab.id)}>{tab.label}</button>)}</div>
            <div className="product-detail-tab-panel" role="tabpanel">
              {selectedDetail?.id === "specifications" && <dl className="product-specifications">{product.specifications.map((item, index) => <div key={item._id || `${item.name}-${index}`}><dt>{item.name}</dt><dd><span className={String(item.value || "").length > 150 ? "product-detail-value-preview" : ""}>{item.value}</span>{String(item.value || "").length > 150 && <button type="button" className="product-description-read-button" onClick={() => setReadModal({ title: item.name || "Specification", text: item.value })}>Read full value</button>}</dd></div>)}</dl>}
              {selectedDetail?.id === "description" && <><div className={`product-long-description ${product.description.length > 360 ? "product-long-description-preview" : ""}`}>{renderProductDescription(product.description)}</div>{product.description.length > 360 && <button type="button" className="product-description-read-button" onClick={() => setReadModal({ title: "Product description", text: product.description, formatted: true })}>Read full description</button>}</>}
              {selectedDetail?.id === "warranty" && <><p className={`product-long-description ${product.warranty.length > 360 ? "product-long-description-preview" : ""}`}>{product.warranty}</p>{product.warranty.length > 360 && <button type="button" className="product-description-read-button" onClick={() => setReadModal({ title: "Warranty information", text: product.warranty })}>Read full warranty</button>}</>}
            </div>
          </section>}
        </section>
      </div>
      {relatedProducts.length > 0 && <section className="product-recommendations">
        <h2>Similar products</h2>
        <div>{relatedProducts.map((item) => <ProductCard key={item._id} product={item} />)}</div>
      </section>}
      {readModal && <div className="product-description-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReadModal(null); }}><section className="product-description-modal" role="dialog" aria-modal="true" aria-labelledby="product-description-modal-title"><header><h2 id="product-description-modal-title">{readModal.title}</h2><button type="button" onClick={() => setReadModal(null)} aria-label="Close details">×</button></header><div className="product-long-description">{readModal.formatted ? renderProductDescription(readModal.text) : readModal.text}</div></section></div>}
      {zoomOpen && pictures[imageIndex] && <div className="product-image-lightbox-backdrop" role="presentation" tabIndex={-1} onClick={(event) => { if (event.target === event.currentTarget) setZoomOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setZoomOpen(false); }}>
        <section className="product-image-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} image viewer`}>
          <button ref={zoomCloseRef} type="button" className="product-image-lightbox-close" onClick={() => setZoomOpen(false)} aria-label="Close image viewer">×</button>
          {pictures.length > 1 && <button type="button" className="product-image-lightbox-nav previous" onClick={() => setImageIndex((index) => (index - 1 + pictures.length) % pictures.length)} aria-label="Previous image">‹</button>}
          <img className="product-image-lightbox-image" src={imageUrl(pictures[imageIndex])} alt={`${product.name} — image ${imageIndex + 1}`} />
          {pictures.length > 1 && <button type="button" className="product-image-lightbox-nav next" onClick={() => setImageIndex((index) => (index + 1) % pictures.length)} aria-label="Next image">›</button>}
          {pictures.length > 1 && <span className="product-image-lightbox-count">{imageIndex + 1} / {pictures.length}</span>}
        </section>
      </div>}
      {!reviewsLoading && reviewData.enabled !== false && (reviewData.reviews?.length > 0 || reviewData.canReview || reviewMessage) && <section className="product-reviews" aria-labelledby="product-reviews-title">
        <div className="product-reviews-heading"><div><span>CUSTOMER FEEDBACK</span><h2 id="product-reviews-title">Ratings &amp; reviews</h2></div>{reviewData.reviews?.length > 0 && <div className="product-review-summary"><strong>{reviewData.averageRating} ★</strong><span>{reviewData.reviewCount} {reviewData.reviewCount === 1 ? "review" : "reviews"}</span></div>}</div>
        {reviewData.canReview && auth.authenticate && <form className="product-review-form" onSubmit={submitReview}>
          <h3>Review this delivered purchase</h3><label>Rating <select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>)}</select></label>
          <label>Title (optional)<input maxLength={120} value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} /></label>
          <label>Your review<textarea required minLength={5} maxLength={3000} rows={4} value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} /></label>
          {reviewError && <p className="product-review-error" role="alert">{reviewError}</p>}
          <button type="submit" disabled={reviewSubmitting}>{reviewSubmitting ? "Submitting…" : "Submit review"}</button>
        </form>}
        {reviewMessage && <p className="product-review-success" role="status">{reviewMessage}</p>}
        {reviewData.reviews?.length > 0 && <div className="product-review-list">{reviewData.reviews.map((review) => <article className="product-review-card" key={review._id}>
          <div className="product-review-rating" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
          {review.title && <h3>{review.title}</h3>}<p>{review.body}</p>
          <div className="product-review-author">{review.user ? `${review.user.firstName} ${review.user.lastName?.[0] || ""}.` : "Customer"} · {new Date(review.createdAt).toLocaleDateString("en-PK")}{review.verifiedPurchase && <span>Verified purchase</span>}</div>
        </article>)}</div>}
      </section>}
    </main>
  </Layout>;
};
export default ProductDetailsPage;
