const xmlEscape = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const trimSlash = (value) => String(value || "").replace(/\/$/, "");
const SITE_URL = "https://subazen.com";
const productionBase = (value) => {
  const candidate = trimSlash(value);
  return candidate && !/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])/i.test(candidate) ? candidate : SITE_URL;
};
const publicImageUrl = (image, publicBase) => {
  const source = String(image?.img || "");
  if (!source) return "";
  if (/^https?:\/\//i.test(source)) return source.replace(/^https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?/i, SITE_URL);
  return source.startsWith("/public/") ? `${publicBase}${source}` : `${publicBase}/public/${source.replace(/^\/+/, "")}`;
};

exports.sitemap = async (_req, res) => {
  try {
    const base = SITE_URL;
    const publicBase = productionBase(process.env.PUBLIC_URL || process.env.API || SITE_URL).replace(/\/api$/i, "");
    const Product = require("../../models/product");
    const Category = require("../../models/category");
    const Page = require("../../models/page");
    const Brand = require("../../models/brand");
    const PriceCollection = require("../../models/priceCollection");
    const FooterSettings = require("../../models/footerSettings");
    const [products, categories, pages, brands, priceCollections, footer] = await Promise.all([
      Product.find({ isActive: { $ne: false } }).select("slug updatedAt productPictures colors featuredImageIndex").lean().exec(),
      Category.find({ isActive: { $ne: false } }).select("_id slug type parentId updatedAt").lean().exec(),
      Page.find({}).select("category updatedAt").lean().exec(),
      Brand.find({ isActive: { $ne: false } }).select("slug categoryIds updatedAt").lean().exec(),
      PriceCollection.find({ isActive: true }).select("slug updatedAt").lean().exec(),
      FooterSettings.findOne({ key: "storefront" }).select("pages updatedAt").lean().exec(),
    ]);

    const categoryById = new Map(categories.map((category) => [String(category._id), category]));
    const pathCache = new Map();
    const categoryPath = (category, seen = new Set()) => {
      if (!category || seen.has(String(category._id))) return [];
      const id = String(category._id);
      if (pathCache.has(id)) return pathCache.get(id);
      const nextSeen = new Set(seen); nextSeen.add(id);
      const parent = category.parentId ? categoryById.get(String(category.parentId)) : null;
      const result = [...categoryPath(parent, nextSeen), category.slug].filter(Boolean);
      pathCache.set(id, result);
      return result;
    };
    const urls = new Map();
    const addUrl = (loc, updatedAt, images = []) => {
      if (!loc || loc.includes("undefined")) return;
      const current = urls.get(loc) || { loc, updatedAt: null, images: [] };
      if (updatedAt && (!current.updatedAt || new Date(updatedAt) > new Date(current.updatedAt))) current.updatedAt = updatedAt;
      current.images.push(...images);
      urls.set(loc, current);
    };
    addUrl(`${base}/`, new Date());
    addUrl(`${base}/contact`, footer?.updatedAt);
    ["about-us", "privacy-policy", "return-policy", "dmca"].forEach((slug) => addUrl(`${base}/pages/${slug}`, footer?.updatedAt));
    for (const product of products) {
      if (!product.slug) continue;
      const imageList = [...(product.productPictures || []), ...(product.colors || []).flatMap((variant) => variant.productPictures || [])];
      addUrl(`${base}/products/${encodeURIComponent(product.slug)}`, product.updatedAt, imageList);
    }
    for (const category of categories) {
      const path = categoryPath(category);
      if (!path.length || category.type === "page") continue;
      addUrl(`${base}/collections/${path.map(encodeURIComponent).join("/")}`, category.updatedAt);
    }
    const pageCategoryIds = new Set(pages.map((page) => String(page.category)));
    for (const page of pages) {
      const category = categoryById.get(String(page.category));
      if (!category || category.type !== "page" || !category.slug || !pageCategoryIds.has(String(category._id))) continue;
      addUrl(`${base}/${encodeURIComponent(category.slug)}?cid=${encodeURIComponent(category._id)}&type=page`, page.updatedAt || category.updatedAt);
    }
    for (const brand of brands) {
      if (!brand.slug) continue;
      for (const categoryId of brand.categoryIds || []) {
        const category = categoryById.get(String(categoryId));
        const path = categoryPath(category);
        if (category && path.length) addUrl(`${base}/collections/${[...path, brand.slug].map(encodeURIComponent).join("/")}`, brand.updatedAt);
      }
    }
    for (const collection of priceCollections) if (collection.slug) addUrl(`${base}/deals/${encodeURIComponent(collection.slug)}`, collection.updatedAt);
    const publishedInformationPages = new Set(["about-us", "privacy-policy", "return-policy", "dmca"]);
    for (const page of footer?.pages || []) {
      if (publishedInformationPages.has(page.slug) || page.content?.trim()) addUrl(`${base}/pages/${encodeURIComponent(page.slug)}`, footer?.updatedAt);
    }

    const body = [...urls.values()].map((item) => {
      const lastmod = item.updatedAt && Number.isFinite(new Date(item.updatedAt).getTime()) ? `<lastmod>${new Date(item.updatedAt).toISOString()}</lastmod>` : "";
      const images = [...new Set(item.images.map((image) => publicImageUrl(image, publicBase)).filter(Boolean))]
        .map((imageUrl) => `<image:image><image:loc>${xmlEscape(imageUrl)}</image:loc></image:image>`).join("");
      return `<url><loc>${xmlEscape(item.loc)}</loc>${lastmod}${images}</url>`;
    }).join("");
    return res.status(200).type("application/xml; charset=utf-8").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${body}</urlset>`);
  } catch (error) {
    console.error("Sitemap generation failed:", error.message);
    return res.status(500).type("text/plain").send("Sitemap unavailable");
  }
};
