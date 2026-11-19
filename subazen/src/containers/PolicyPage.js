import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";
import axios from "../helpers/axios";
import usePageMeta from "../hooks/usePageMeta";
import { getStoreInformationPage } from "../content/storeInformationPages";
import "./PolicyPage.css";

const knownPages = { "about-us": "About Us", "privacy-policy": "Privacy Policy", "return-policy": "Returns and Refunds", dmca: "DMCA" };

const safeHref = (href) => /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(href) ? href : "";
const renderInline = (text, keyPrefix) => text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
  if (part.startsWith("**") && part.endsWith("**")) return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
  const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (!link) return part;
  const href = safeHref(link[2].trim());
  return href ? <a key={`${keyPrefix}-${index}`} href={href} target={/^https?:\/\//i.test(href) ? "_blank" : undefined} rel={/^https?:\/\//i.test(href) ? "noreferrer" : undefined}>{link[1]}</a> : link[1];
});
const renderContent = (content) => content.split(/\n\s*\n/).filter(Boolean).map((block, index) => {
  const heading = block.match(/^#{1,3}\s+(.+)$/);
  if (heading) return <h2 key={index}>{renderInline(heading[1], `heading-${index}`)}</h2>;
  const lines = block.split("\n");
  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) return <ul key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{renderInline(line.replace(/^\s*[-*]\s+/, ""), `${index}-${lineIndex}`)}</li>)}</ul>;
  return <p key={index}>{renderInline(block, `paragraph-${index}`)}</p>;
});

export default function PolicyPage({ match }) {
  const slug = match.params.slug;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const fallbackPage = getStoreInformationPage(slug);
  const title = page?.title || fallbackPage?.title || knownPages[slug] || "Store information";
  const content = page?.content?.trim() || fallbackPage?.content || "";
  const metaDescription = content.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*#]/g, "").replace(/\s+/g, " ").slice(0, 160);
  usePageMeta({ title: `${title} | Subazen`, description: metaDescription || `${title} from Subazen.`, canonical: `${window.location.origin}/pages/${slug}` });

  useEffect(() => {
    let current = true;
    axios.get("/footer").then((response) => {
      if (!current) return;
      setPage(response.data?.settings?.pages?.find((item) => item.slug === slug) || null);
    }).catch(() => { if (current) setPage(null); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [slug]);

  return <Layout hideCategoryNav><main className="policy-page">
    {loading ? <p role="status">Loading page...</p> : knownPages[slug] && content ? <>
      <h1>{title}</h1>
      <div className="policy-page-content">{renderContent(content)}</div>
      <nav className="policy-related-links" aria-label="Related store information"><strong>More store information</strong><div>{Object.entries(knownPages).filter(([pageSlug]) => pageSlug !== slug).map(([pageSlug, pageTitle]) => <Link key={pageSlug} to={`/pages/${pageSlug}`}>{pageTitle}</Link>)}<Link to="/contact">Contact Us</Link></div></nav>
    </> : <section className="policy-page-empty"><h1>{knownPages[slug] || "Page not found"}</h1><p>This information page has not been published yet.</p></section>}
  </main></Layout>;
}
