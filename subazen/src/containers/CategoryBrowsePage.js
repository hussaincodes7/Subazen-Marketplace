import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { getCategoryIcon } from "../utils/categoryIcons";
import axios from "../helpers/axios";
import Layout from "../components/Layout";
import ProductCard from "../components/UI/ProductCard";
import { generatePublicUrl } from "../urlConfig";
import usePageMeta from "../hooks/usePageMeta";
import "./CategoryBrowsePage.css";

const readQuery = (search) => new URLSearchParams(search);

export default function CategoryBrowsePage() {
  const history = useHistory(); const location = useLocation();
  const segments = useMemo(() => location.pathname.replace(/^\/collections\/?/, "").split("/").filter(Boolean), [location.pathname]);
  const params = useMemo(() => readQuery(location.search), [location.search]);
  const [data, setData] = useState({ products: [], childCategories: [], brands: [], priceCollections: [], categoryPath: [] });
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [minPrice, setMinPrice] = useState(params.get("minPrice") || ""); const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || "");
  const [sort, setSort] = useState(params.get("sort") || "relevance"); const [stock, setStock] = useState(params.get("stock") || "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const page = Math.max(1, Number(params.get("page") || 1));

  const load = useCallback(async () => {
    if (!segments.length) return;
    setLoading(true); setError("");
    try {
      const response = await axios.get("/browse", { params: { path: segments.join("/"), page, limit: 24, sort, stock, brand: params.get("brand") || "", ...(minPrice !== "" ? { minPrice } : {}), ...(maxPrice !== "" ? { maxPrice } : {}) } });
      setData(response.data || { products: [], childCategories: [], brands: [], categoryPath: [] });
    } catch (requestError) { setError(requestError.response?.data?.message || "Could not load this category. Please try again."); }
    finally { setLoading(false); }
  }, [segments, page, sort, stock, minPrice, maxPrice, params]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setMinPrice(params.get("minPrice") || ""); setMaxPrice(params.get("maxPrice") || ""); setSort(params.get("sort") || "relevance"); setStock(params.get("stock") || ""); }, [params]);

  const title = data.brand?.name ? `${data.brand.name} ${data.category?.name || ""}`.trim() : data.category?.name || "Shop by category";
  const isCustomPrintingCatalog = (data.categoryPath || []).some((category) => {
    const name = String(category.name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const slug = String(category.slug || "").trim().toLowerCase();
    return name === "printingandcustomproducts" || slug === "printing-and-custom-products";
  });
  const categorySchema = useMemo(() => {
    if (!data.category) return null;
    const canonical = `${window.location.origin}${location.pathname}`;
    const breadcrumbs = [{ "@type": "ListItem", position: 1, name: "Home", item: `${window.location.origin}/` }, ...(data.categoryPath || []).map((item, index) => ({ "@type": "ListItem", position: index + 2, name: item.name, item: `${window.location.origin}/collections/${(data.categoryPath || []).slice(0, index + 1).map((node) => node.slug).join("/")}` }))];
    if (data.brand) breadcrumbs.push({ "@type": "ListItem", position: breadcrumbs.length + 1, name: data.brand.name, item: canonical });
    return [
      { "@context": "https://schema.org", "@type": "CollectionPage", name: title, description: `Browse ${title} products at Subazen in Pakistan.`, url: canonical, breadcrumb: { "@type": "BreadcrumbList", itemListElement: breadcrumbs } },
      ...(data.products?.length ? [{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: data.products.map((product, index) => ({ "@type": "ListItem", position: index + 1, url: `${window.location.origin}/products/${product.slug}`, name: product.name })) }] : []),
    ];
  }, [data.category, data.categoryPath, data.brand, data.products, location.pathname, title]);
  usePageMeta({ title: `${title} | Subazen Pakistan`, description: `Shop ${title} in Pakistan. Compare available products, brands and prices, with Cash on Delivery across Pakistan.`, canonical: `${window.location.origin}${location.pathname}`, schema: categorySchema, image: data.category?.coverImage || data.category?.categoryImage ? generatePublicUrl(data.category.coverImage || data.category.categoryImage) : undefined });
  const updateRoute = (updates = {}) => {
    const next = new URLSearchParams(location.search);
    Object.entries(updates).forEach(([key, value]) => value === "" || value == null ? next.delete(key) : next.set(key, String(value)));
    if (Object.keys(updates).some((key) => key !== "page")) next.delete("page");
    history.push(`${location.pathname}${next.toString() ? `?${next}` : ""}`);
  };
  if (!data.category && loading) return <Layout><main className="category-browse-page"><p className="category-loading" role="status">Loading this category…</p></main></Layout>;
  if (!data.category && error) return <Layout><main className="category-browse-page"><div className="category-error category-page-error" role="alert"><h1>We couldn’t load this category</h1><p>{error}</p><button type="button" onClick={load}>Try again</button></div></main></Layout>;

  return <Layout><main className="category-browse-page">
    <nav className="category-breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link>{(data.categoryPath || []).map((item) => <React.Fragment key={item._id}><span aria-hidden="true">›</span><Link to={`/collections/${(data.categoryPath || []).slice(0, (data.categoryPath || []).findIndex((node) => node._id === item._id) + 1).map((node) => node.slug).join("/").toLowerCase()}`}>{item.name}</Link></React.Fragment>)}{data.brand && <><span aria-hidden="true">›</span><span>{data.brand.name}</span></>}</nav>
    {!data.brand && !!data.childCategories?.length && <section className="category-browse-section category-child-section"><div className="category-section-title"><div><span>EXPLORE</span><h2>{isCustomPrintingCatalog ? "Shop by Catalog" : segments.length > 1 ? "Shop by brand" : "Shop by category"}</h2></div></div><div className="category-tiles">{data.childCategories.map((category) => { const TileIcon = getCategoryIcon(category); return <Link key={category._id} className="category-tile" to={`/collections/${[...segments, category.slug].join("/")}`}>{category.categoryImage ? <img src={generatePublicUrl(category.categoryImage)} alt="" loading="lazy" /> : <span className="category-tile-fallback"><TileIcon aria-hidden="true" /></span>}<strong>{category.name}</strong><span className="category-tile-arrow">Explore</span></Link>; })}</div></section>}

    {!data.brand && !!data.brands?.length && <section className="category-browse-section"><div className="category-section-title"><div><span>TOP BRANDS</span><h2>Shop by brand</h2></div></div><div className="brand-tiles">{data.brands.map((brand) => <Link key={brand._id} className="brand-tile" to={`/collections/${[...segments, brand.slug].join("/")}`}>{brand.logo ? <img src={generatePublicUrl(brand.logo)} alt={`${brand.name} logo`} loading="lazy" /> : <span>{brand.name.slice(0, 1)}</span>}<strong>{brand.name}</strong><small>Explore</small></Link>)}</div></section>}

    <section className="category-results-section"><div className="category-results-heading"><div><span className="category-browse-eyebrow">{data.brand ? "BRAND COLLECTION" : "PRODUCTS"}</span><h2>{data.brand ? `${data.brand.name} ${data.category?.name || ""}` : `Popular in ${data.category?.name || "this category"}`}</h2><p>{data.pagination?.total || 0} matching products</p></div><FormSort sort={sort} onChange={(value) => { setSort(value); updateRoute({ sort: value }); }} /></div>
      <div className="category-results-layout"><aside className="category-filters">
        <button type="button" className="category-filter-toggle" aria-expanded={filtersOpen} aria-controls="category-filter-options" onClick={() => setFiltersOpen((open) => !open)}><span>Filter</span><span className="category-filter-toggle-icon" aria-hidden="true">{filtersOpen ? "−" : "+"}</span></button>
        <h3>Filter by</h3>
        <div id="category-filter-options" className={`category-filter-content${filtersOpen ? " is-open" : ""}`}>
          <form onSubmit={(event) => { event.preventDefault(); updateRoute({ minPrice, maxPrice, stock }); setFiltersOpen(false); }}>
            <label>Min price (PKR)<input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /></label>
            <label>Max price (PKR)<input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></label>
            <label className="category-stock-filter"><input type="checkbox" checked={stock === "in"} onChange={(event) => { const value = event.target.checked ? "in" : ""; setStock(value); updateRoute({ stock: value }); }} /> In stock</label>
            {!data.brand && !!data.brands?.length && <fieldset className="category-brand-filter"><legend>Brand</legend>{data.brands.map((brand) => <label key={brand._id}><input type="checkbox" checked={params.get("brand") === brand.slug} onChange={(event) => updateRoute({ brand: event.target.checked ? brand.slug : "" })} /> {brand.name}</label>)}</fieldset>}
            <button type="submit">Apply</button>
            <button type="button" className="category-clear-filter" onClick={() => { setMinPrice(""); setMaxPrice(""); setStock(""); setSort("relevance"); setFiltersOpen(false); history.push(location.pathname); }}>Clear</button>
          </form>
        </div>
      </aside>
        <div className="category-product-area">{loading && <p role="status">Loading products…</p>}{error && <div className="category-error" role="alert">{error}</div>}{!loading && !error && !data.products?.length && <div className="category-empty"><h3>No products match these filters</h3><p>Try changing the price range or stock filter.</p></div>}<div className="category-product-grid">{(data.products || []).map((product) => <ProductCard key={product._id} product={product} />)}</div>
          {data.pagination?.pages > 1 && <nav className="category-pagination" aria-label="Product pages"><button disabled={page <= 1} onClick={() => updateRoute({ page: page - 1 })}>Previous</button><span>Page {page} of {data.pagination.pages}</span><button disabled={page >= data.pagination.pages} onClick={() => updateRoute({ page: page + 1 })}>Next</button></nav>}
        </div>
      </div>
    </section>
  </main></Layout>;
}

function FormSort({ sort, onChange }) {
  return <label className="category-sort">Sort by <select value={sort} onChange={(event) => onChange(event.target.value)}><option value="relevance">Recommended</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label>;
}
