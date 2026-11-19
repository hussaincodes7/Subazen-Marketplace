import { useEffect } from "react";
const SITE_ORIGIN = "https://subazen.com";
const makeProductionUrl = (value) => {
  if (!value) return value;
  const raw = String(value);
  if (raw.startsWith("/") && !raw.startsWith("//")) return `${SITE_ORIGIN}${raw}`;
  return raw.replace(/^https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?/i, SITE_ORIGIN);
};
const makeSchemaProductionSafe = (value, property = "") => {
  if (typeof value === "string") return ["url", "item", "image", "logo", "target"].includes(property) ? makeProductionUrl(value) : value;
  if (Array.isArray(value)) return value.map((item) => makeSchemaProductionSafe(item, property));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, makeSchemaProductionSafe(item, key)]));
  return value;
};
const ensureMeta = (attribute, key) => {
  let node = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!node) { node = document.createElement("meta"); node.setAttribute(attribute, key); document.head.appendChild(node); }
  return node;
};
export default function usePageMeta({ title, description, canonical, schema, image, robots = "index, follow" }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) ensureMeta("name", "description").setAttribute("content", String(description).replace(/\s+/g, " ").slice(0, 160));
    ensureMeta("name", "robots").setAttribute("content", robots);
    if (canonical) {
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
      link.href = makeProductionUrl(canonical);
    }
    const openGraph = { "og:title": title, "og:description": description, "og:url": makeProductionUrl(canonical), "og:type": "website", "og:image": makeProductionUrl(image), "twitter:card": "summary_large_image", "twitter:title": title, "twitter:description": description, "twitter:image": makeProductionUrl(image) };
    Object.entries(openGraph).forEach(([key, content]) => {
      if (!content) return;
      const isTwitter = key.startsWith("twitter:");
      ensureMeta(isTwitter ? "name" : "property", key).setAttribute("content", content);
    });
    if (!image) {
      document.head.querySelector('meta[property="og:image"]')?.remove();
      document.head.querySelector('meta[property="twitter:image"]')?.remove();
    }
    let data = document.getElementById("page-jsonld");
    if (!data) { data = document.createElement("script"); data.id = "page-jsonld"; data.type = "application/ld+json"; document.head.appendChild(data); }
    const organization = { "@context": "https://schema.org", "@type": "Organization", name: "Subazen", description: "Subazen is an online marketplace serving customers across Pakistan.", url: SITE_ORIGIN };
    const website = { "@context": "https://schema.org", "@type": "WebSite", name: "Subazen", description: "Shop products across categories from the Subazen online marketplace in Pakistan.", url: SITE_ORIGIN, potentialAction: { "@type": "SearchAction", target: `${SITE_ORIGIN}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } };
    const webpage = { "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: makeProductionUrl(canonical) };
    data.textContent = JSON.stringify(makeSchemaProductionSafe([organization, website, webpage, ...(Array.isArray(schema) ? schema : schema ? [schema] : [])]));
    return () => {};
  }, [title, description, canonical, schema, image, robots]);
}
