import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import ProductCard from "../../components/UI/ProductCard";
import axios from "../../helpers/axios";
import { generatePublicUrl } from "../../urlConfig";
import usePageMeta from "../../hooks/usePageMeta";
import { Link } from "react-router-dom";
import { getCategoryIcon } from "../../utils/categoryIcons";
import "./style.css";

const uniqueProducts = (items) => [...new Map(items.filter((item) => item?._id && item.slug).map((item) => [String(item._id), item])).values()];

function BannerContents({ banner }) {
  const desktopImage = banner.image || banner.mobileImage;
  const mobileImage = banner.mobileImage || desktopImage;
  return <>
    <picture>
      <source media="(max-width: 640px)" srcSet={encodeURI(generatePublicUrl(mobileImage))} />
      <img src={generatePublicUrl(desktopImage)} alt={banner.title || "Subazen promotion"} />
    </picture>
    {(banner.title || banner.description) && <div className="home-banner-copy">{banner.title && <h1>{banner.title}</h1>}{banner.description && <p>{banner.description}</p>}</div>}
  </>;
}

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState([]);
  const [priceCollections, setPriceCollections] = useState([]);
  const [priceCollectionProducts, setPriceCollectionProducts] = useState({});
  const [activeBanner, setActiveBanner] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [randomProducts, setRandomProducts] = useState([]);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomHasMore, setRandomHasMore] = useState(false);
  const [randomSectionRef, setRandomSectionRef] = useState(null);
  usePageMeta({
    title: "Subazen | Online Marketplace in Pakistan",
    description: "Explore products across categories at Subazen, an online marketplace serving customers in Pakistan. Shop with Cash on Delivery.",
    canonical: `${window.location.origin}/`,
  });
  useEffect(() => {
    let current = true;
    axios.get("/products", { params: { page: 1, limit: 24 } })
      .then((response) => { if (current) {
        const firstPage = response.data?.products || [];
        setProducts(firstPage);
      } })
      .catch((requestError) => { if (current) setError(requestError.response?.data?.message || "Could not load products. Please try again."); })
      .finally(() => { if (current) setLoading(false); });
    axios.get("/homepage")
      .then((response) => { if (current) {
        const homepageSections = response.data?.sections || [];
        setSections(homepageSections);
        const recentIntent = window.localStorage.getItem("subazen-search-intent") || "";
        const recommendationSection = homepageSections.find((section) => section.type === "recommended" || (section.type === "products" && /recommended/i.test(section.title || "")));
        const fallbackIds = (recommendationSection?.productIds || []).map((item) => String(item?._id || item));
        if (recentIntent.trim().length >= 2) {
          axios.get("/search", { params: { q: recentIntent } }).then((searchResponse) => {
            if (!current) return;
            const intentMatches = searchResponse.data?.products || [];
            const curated = fallbackIds.map((id) => firstPageProduct(homepageSections, id)).filter(Boolean);
            setRecommendedProducts(uniqueProducts([...curated, ...intentMatches]));
          }).catch(() => { if (current) setRecommendedProducts(resolveCuratedProducts(homepageSections, fallbackIds)); });
        } else if (fallbackIds.length) setRecommendedProducts(resolveCuratedProducts(homepageSections, fallbackIds));
      } })
      .catch(() => { if (current) setSections([]); });
    axios.get("/products/discover", { params: { limit: 12 } })
      .then((response) => { if (current) { setRandomProducts(response.data?.products || []); setRandomHasMore(response.data?.hasMore === true); } })
      .catch(() => { if (current) setRandomHasMore(false); });
    axios.get("/price-collections", { params: { homepage: true } }).then(async (response) => {
      const collections = response.data?.collections || [];
      if (!current) return;
      setPriceCollections(collections);
      const productsByCollection = await Promise.all(collections.map(async (collection) => {
        try { const result = await axios.get(`/price-collections/${collection.slug}/products`, { params: { limit: 8 } }); return [collection._id, result.data?.products || []]; }
        catch (_error) { return [collection._id, []]; }
      }));
      if (current) setPriceCollectionProducts(Object.fromEntries(productsByCollection));
    }).catch(() => { if (current) setPriceCollections([]); });
    return () => { current = false; };
  }, []);

  const firstPageProduct = (homepageSections, id) => homepageSections.flatMap((section) => section.productIds || []).find((item) => String(item?._id || item) === id && typeof item === "object") || null;
  const resolveCuratedProducts = (homepageSections, ids) => uniqueProducts(ids.map((id) => firstPageProduct(homepageSections, id)).filter(Boolean));

  const discoverProducts = randomProducts;

  useEffect(() => {
    if (!randomSectionRef || !randomHasMore || randomLoading) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setRandomLoading(true);
      const excludedIds = [...new Set(randomProducts.map((product) => String(product._id)))].slice(-300);
      axios.get("/products/discover", { params: { limit: 12, exclude: excludedIds.join(",") } }).then((response) => {
        const nextProducts = uniqueProducts(response.data?.products || []);
        setRandomProducts((current) => uniqueProducts([...current, ...nextProducts]).slice(0, 300));
        setRandomHasMore(response.data?.hasMore === true && nextProducts.length > 0 && randomProducts.length + nextProducts.length < 300);
      }).catch(() => setRandomHasMore(false)).finally(() => setRandomLoading(false));
    }, { rootMargin: "300px" });
    observer.observe(randomSectionRef);
    return () => observer.disconnect();
  }, [randomSectionRef, randomHasMore, randomLoading, randomProducts]);

  const scrollCards = (event, direction = 1) => {
    const track = event.currentTarget.parentElement?.querySelector(".home-spotlight-track, .home-recommendation-track");
    if (track) track.scrollBy({ left: direction * Math.max(220, track.clientWidth * .8), behavior: "smooth" });
  };

  const banners = sections.filter((section) => section.type === "banner" && section.enabled !== false && (section.image || section.mobileImage));
  useEffect(() => {
    setActiveBanner((index) => Math.min(index, Math.max(0, banners.length - 1)));
    if (banners.length < 2) return undefined;
    const timer = window.setInterval(() => setActiveBanner((index) => (index + 1) % banners.length), 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  return <Layout>
    <main className="home-page">
      {banners.length > 0 && <section className="home-banner-slider" aria-label="Store promotions">
        {banners.map((banner, index) => <article className={`home-banner-slide${index === activeBanner ? " is-active" : ""}`} key={banner._id || index} aria-hidden={index !== activeBanner}>
          {banner.href ? <a className="home-banner-link" href={banner.href} tabIndex={index === activeBanner ? 0 : -1} aria-label={banner.title || "Open promotion"}><BannerContents banner={banner} /></a> : <BannerContents banner={banner} />}
        </article>)}
        {banners.length > 1 && <>
          <button className="home-banner-control previous" type="button" aria-label="Previous banner" onClick={() => setActiveBanner((index) => (index - 1 + banners.length) % banners.length)}>‹</button>
          <button className="home-banner-control next" type="button" aria-label="Next banner" onClick={() => setActiveBanner((index) => (index + 1) % banners.length)}>›</button>
          <div className="home-banner-dots" role="tablist" aria-label="Choose a banner">{banners.map((banner, index) => <button key={banner._id || index} type="button" role="tab" aria-label={`Show banner ${index + 1}`} aria-selected={index === activeBanner} onClick={() => setActiveBanner(index)} />)}</div>
        </>}
      </section>}
      {sections.filter((section) => section.type !== "banner" && section.enabled !== false).map((section, sectionIndex) => {
        if (section.type === "text") return <section className="home-cms-text" key={section._id || sectionIndex}><h2>{section.title}</h2><p>{section.description}</p></section>;
        if (section.type === "spotlight") return <section className="home-spotlight-section" key={section._id || sectionIndex}>
          <div className="home-section-heading"><h2>{section.title || "In The Spotlight"}</h2></div>
          <div className="home-spotlight-carousel"><div className="home-spotlight-track" style={{ "--spotlight-card-width": `${Math.max(140, Math.min(360, [220, 250].includes(Number(section.cardWidth)) ? 200 : (Number(section.cardWidth) || 200)))}px` }}>
            {(section.spotlightCards || []).map((card) => { const product = card.productId && typeof card.productId === "object" ? card.productId : null; if (!product?.slug) return null; return <Link className="home-spotlight-card" to={`/products/${product.slug}`} key={card._id || product._id} aria-label={`View ${product.name}`}>
              {card.image ? <img src={generatePublicUrl(card.image)} alt={product.name} loading="lazy" /> : <div className="home-spotlight-card-empty">{product.name}</div>}
            </Link>; })}
          </div>{(section.spotlightCards || []).length > 1 && <button className="home-spotlight-next" type="button" aria-label="More spotlight cards" onClick={(event) => scrollCards(event)}>›</button>}</div>
        </section>;
        if (section.type === "categories") return <section className="home-products" key={section._id || sectionIndex}><div className="home-section-heading"><div><span className="home-eyebrow">EXPLORE</span><h2>{section.title || "Categories"}</h2></div></div><div className="home-category-grid">{(section.categoryIds || []).map((category) => { const CategoryIcon = getCategoryIcon(category); const isSubcategory = (category.path || []).length > 1; return <a key={category._id} href={`/collections/${(category.path || [{ slug: category.slug }]).map((item) => item.slug).join("/")}`}>{isSubcategory && category.categoryImage ? <img src={generatePublicUrl(category.categoryImage)} alt="" loading="lazy" /> : <span className="home-category-icon"><CategoryIcon aria-hidden="true" /></span>}<strong>{category.name}</strong></a>; })}</div></section>;
        if (section.type === "recommended" || (section.type === "products" && /recommended/i.test(section.title || ""))) {
          const configured = section.productIds || [];
          const curated = configured.filter((item) => typeof item === "object" && item.slug);
          const cards = recommendedProducts.length ? uniqueProducts([...curated, ...recommendedProducts]) : curated;
          return cards.length ? <section className="home-products" key={section._id || sectionIndex}><div className="home-section-heading"><div><span className="home-eyebrow">BASED ON YOUR INTEREST</span><h2>{section.title || "Recommended for you"}</h2></div></div><div className="home-recommendation-carousel"><div className="home-recommendation-track">{cards.map((product) => <ProductCard key={product._id} product={product} />)}</div>{cards.length > 2 && <button className="home-spotlight-next" type="button" aria-label="More recommended products" onClick={(event) => scrollCards(event)}>›</button>}</div></section> : null;
        }
        if (section.type === "products") {
          const selectedProducts = section.productIds?.length ? section.productIds : products;
          return <section className="home-products" key={section._id || sectionIndex}><div className="home-section-heading"><div><span className="home-eyebrow">SHOP</span><h2>{section.title || "Featured products"}</h2></div></div><div className={`home-product-grid ${section.layout === "slider" ? "is-slider" : ""}`}>{selectedProducts.map((product) => {
            return <ProductCard key={product._id} product={product} />;
          })}</div></section>;
        }
        return null;
      })}
      <section className="home-products home-random-products" ref={setRandomSectionRef}><div className="home-section-heading"><div><span className="home-eyebrow">MORE TO EXPLORE</span><h2>Discover more products</h2></div></div><div className="home-product-grid">{discoverProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>{randomLoading && <p role="status" className="home-random-loading">Loading more products…</p>}{!randomLoading && randomProducts.length === 0 && <p className="home-random-loading">Products will appear here as they become available.</p>}</section>
      {priceCollections.map((collection) => <section className="home-products home-price-collection" key={collection._id}><div className="home-section-heading"><div><span className="home-eyebrow">SHOP BY PRICE</span><h2>{collection.title}</h2></div><Link to={`/deals/${collection.slug}`} className="home-price-view-all">View all <span aria-hidden="true">→</span></Link></div><div className="home-product-grid">{(priceCollectionProducts[collection._id] || []).map((product) => <ProductCard key={product._id} product={product} />)}</div></section>)}
      {!sections.length && <section id="products" className="home-products">
        <div className="home-section-heading"><div><span className="home-eyebrow">SHOP THE CATALOG</span><h2>Available products</h2></div><span>{products.length} shown</span></div>
        {loading && <p role="status">Loading products…</p>}
        {error && <p className="home-error" role="alert">{error}</p>}
        {!loading && !error && products.length === 0 && <div className="home-empty"><h3>Products are being added</h3><p>Please check back soon.</p></div>}
        <div className="home-product-grid">
          {products.map((product) => {
            return <ProductCard key={product._id} product={product} />;
          })}
        </div>
      </section>}
    </main>
  </Layout>;
}
