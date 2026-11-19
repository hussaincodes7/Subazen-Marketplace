import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import ProductCard from "../../components/UI/ProductCard";
import axios from "../../helpers/axios";
import usePageMeta from "../../hooks/usePageMeta";
import "./style.css";

export default function SearchPage({ location }) {
  const query = new URLSearchParams(location.search).get("q") || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  usePageMeta({
    title: query ? `Shop ${query.slice(0, 55)} | Subazen` : "Search products | Subazen",
    description: query ? `Find ${query} and related products at Subazen. Browse real product matches and shop with Cash on Delivery in Pakistan.` : "Search Subazen products by name, brand, category, or product type.",
    canonical: `${window.location.origin}/search`,
    robots: "noindex, follow",
  });

  useEffect(() => {
    let current = true;
    if (query.trim().length < 2) {
      setProducts([]);
      return () => { current = false; };
    }
    setLoading(true);
    setError("");
    axios.get("/search", { params: { q: query } })
      .then((response) => { if (current) setProducts(response.data?.products || []); })
      .catch((requestError) => { if (current) setError(requestError.response?.data?.message || "Search is temporarily unavailable."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [query]);

  return <Layout>
    <main className="search-results-page">
      <h1>{query ? `Search results for “${query}”` : "Search Subazen"}</h1>
      {loading && <p role="status">Searching products…</p>}
      {error && <p className="search-error" role="alert">{error}</p>}
      {!loading && !error && query.trim().length >= 2 && products.length === 0 && <section className="search-empty"><h2>No matching products found</h2><p>Try a shorter phrase, another spelling, or a product category.</p></section>}
      <section className="search-results-grid" aria-label="Search results">
        {products.map((product) => <ProductCard key={product._id} product={product} />)}
      </section>
    </main>
  </Layout>;
}
