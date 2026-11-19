const TrackingSettings = require("../../models/trackingSettings");

const pageOptions = new Set(["all", "home", "cart", "checkout", "product", "category", "search", "account", "policy", "contact", "custom"]);
const googleHosts = new Set(["www.googletagmanager.com", "googletagmanager.com", "www.google-analytics.com", "google-analytics.com", "www.googleadservices.com", "googleadservices.com", "www.google.com", "google.com", "www.doubleclick.net", "doubleclick.net"]);

const validateGoogleSnippet = (code, provider) => {
  const snippet = String(code || "").trim();
  if (!snippet || snippet.length > 15000) throw new Error("Paste a Google tracking snippet under 15,000 characters.");
  if (!/<\s*(?:script|iframe|noscript)\b/i.test(snippet)) throw new Error("Paste the complete Google-provided script or noscript snippet.");
  if (/<\s*(?:object|embed|form|img|link|meta)\b|\bon[a-z]+\s*=|javascript:|data:text\/html|document\.cookie|document\.write|\beval\s*\(|new\s+Function|\b(?:fetch|XMLHttpRequest)\s*\(/i.test(snippet)) {
    throw new Error("This editor accepts Google Analytics or Google Ads snippets only; remove unrelated or unsafe markup.");
  }
  const externalScripts = [...snippet.matchAll(/<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  for (const match of externalScripts) {
    let host;
    try { host = new URL(match[2]).hostname.toLowerCase(); } catch { throw new Error("Google script URLs must use HTTPS."); }
    if (!match[2].startsWith("https://") || !googleHosts.has(host)) throw new Error("Only secure Google Analytics, Google Ads, or Google Tag Manager script URLs are allowed.");
  }
  const iframes = [...snippet.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  for (const match of iframes) {
    let host;
    try { host = new URL(match[1]).hostname.toLowerCase(); } catch { throw new Error("Google iframe URLs must use HTTPS."); }
    if (!match[1].startsWith("https://") || !googleHosts.has(host)) throw new Error("Only secure Google iframe URLs are allowed.");
  }
  if (!/googletagmanager\.com|google-analytics\.com|googleadservices\.com|doubleclick\.net|\b(?:G|AW|GTM)-[A-Z0-9-]+\b/i.test(snippet)) {
    throw new Error(`The snippet does not look like a Google ${provider === "google-ads" ? "Ads" : "Analytics"} tag.`);
  }
  const inlineScripts = [...snippet.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter((match) => !/\bsrc\s*=/i.test(match[1]) && match[2].trim());
  for (const match of inlineScripts) {
    if (!/\b(?:G|AW|GTM)-[A-Z0-9-]+\b|googletagmanager\.com/i.test(match[2])) throw new Error("Inline scripts must be part of a standard Google tag or Tag Manager snippet.");
  }
  return snippet;
};

const cleanScript = (entry, index) => {
  const provider = entry.provider;
  if (!["google-analytics", "google-ads"].includes(provider)) throw new Error(`Tracking item ${index + 1} must be Google Analytics or Google Ads.`);
  const placement = entry.placement === "body" ? "body" : entry.placement === "head" ? "head" : "";
  if (!placement) throw new Error(`Choose Head or Body placement for tracking item ${index + 1}.`);
  const pages = [...new Set((Array.isArray(entry.pages) ? entry.pages : []).filter((page) => pageOptions.has(page)))];
  if (!pages.length) throw new Error(`Choose at least one page for tracking item ${index + 1}.`);
  const customPath = String(entry.customPath || "").trim();
  if (pages.includes("custom") && (!customPath.startsWith("/") || customPath.includes("?") || customPath.includes("#") || customPath.includes(".."))) throw new Error(`Enter a valid site path for tracking item ${index + 1}, such as /pages/about-us.`);
  if (entry.enabled !== false) validateGoogleSnippet(entry.code, provider);
  return {
    provider,
    name: String(entry.name || (provider === "google-ads" ? "Google Ads" : "Google Analytics")).trim().slice(0, 100),
    placement,
    pages: pages.includes("all") ? ["all"] : pages,
    customPath: pages.includes("custom") ? customPath : "",
    code: String(entry.code || "").trim().slice(0, 15000),
    enabled: entry.enabled !== false,
  };
};

exports.getPublicTracking = async (_req, res) => {
  try {
    const settings = await TrackingSettings.findOne({ key: "storefront" }).select("scripts").lean().exec();
    return res.status(200).json({ scripts: (settings?.scripts || []).filter((item) => item.enabled) });
  } catch (error) {
    console.error("Public tracking settings lookup failed:", error.message);
    return res.status(500).json({ message: "Could not load tracking settings." });
  }
};

exports.getTrackingSettings = async (_req, res) => {
  try {
    const settings = await TrackingSettings.findOneAndUpdate({ key: "storefront" }, { $setOnInsert: { key: "storefront", scripts: [] } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).lean().exec();
    return res.status(200).json({ settings });
  } catch (error) {
    console.error("Admin tracking settings lookup failed:", error.message);
    return res.status(500).json({ message: "Could not load tracking settings." });
  }
};

exports.updateTrackingSettings = async (req, res) => {
  try {
    if (!Array.isArray(req.body?.scripts) || req.body.scripts.length > 20) return res.status(400).json({ message: "Tracking settings must contain a list of up to 20 Google tags." });
    const scripts = req.body.scripts.map(cleanScript);
    const settings = await TrackingSettings.findOneAndUpdate({ key: "storefront" }, { $set: { scripts } }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }).lean().exec();
    return res.status(200).json({ settings, message: "Google tracking settings saved." });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not save tracking settings." });
  }
};
