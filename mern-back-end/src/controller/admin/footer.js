const FooterSettings = require("../../models/footerSettings");

const defaultPageContent = {
  "about-us": "Subazen is an online marketplace serving customers in Pakistan. Our store is based in Karim Park, Lahore. Browse the current product catalogue for available items, descriptions and prices.\n\nOrders are placed through our website and are currently paid by Cash on Delivery. Any shipping charges are shown before you submit an order. For questions about a product or an existing order, use the Contact Us page or email hafizahsanashfaq17@gmail.com.\n\nStore information: Privacy Policy, Returns and Refunds, and DMCA. These pages and our contact details are available from the website footer.",
  "privacy-policy": "Subazen receives information you provide when placing an order or contacting support. This can include your name, phone number, email address, delivery address, order details and the contents of your message.\n\nWe use this information to process and deliver orders, share order updates, respond to enquiries, maintain account and order records, and protect the website from misuse. Checkout currently offers Cash on Delivery; do not send payment card details through the contact form.\n\nThe website may use browser storage needed for cart, sign-in and site preferences. Analytics or optional cookies are used only if enabled on the site. Information is kept for as long as it is needed to handle orders, support requests and related business records.\n\nTo ask about, correct or request removal of personal information, email hafizahsanashfaq17@gmail.com with the subject Privacy Request. We may need to retain information connected to an order or an unresolved support matter.\n\nRelated information: About Us, Returns and Refunds, DMCA. Contact Us is available in the footer.",
  "return-policy": "If an order arrives damaged, incorrect or incomplete, contact Subazen support as soon as possible. Include your order number, the product name, a description of the issue and clear photos when they help explain the problem.\n\nReturn eligibility can depend on the product and its condition. Check any product-specific return information shown on the product page or order communications. Support will review the details and explain the available next steps.\n\nWhere a return, replacement or refund is approved, our team will confirm the arrangement directly with you. For Cash on Delivery orders, contact support before sending an item back so the return and any refund arrangement can be coordinated. Do not ship an item until support has provided instructions.\n\nFor help with a return, use Contact Us or email hafizahsanashfaq17@gmail.com and include your order number. Related information: About Us, Privacy Policy, DMCA.",
  dmca: "Subazen respects intellectual property rights and reviews reports about material on this website. If you believe content available through Subazen uses work you own or are authorized to represent without permission, email hafizahsanashfaq17@gmail.com with the subject Copyright Report.\n\nPlease include your name and contact details, a description of the work, the exact page or product URL, an explanation of your relationship to the rights holder, and any information that helps us review the report. Send only information you are comfortable sharing with the store team.\n\nWe will review the report and may contact you for clarification. Where appropriate, we may restrict or remove the reported material while it is reviewed. If you believe content was reported or restricted by mistake, reply to the case email with the relevant URL and an explanation.\n\nRelated information: About Us, Privacy Policy, Returns and Refunds. Contact Us is available in the footer. This page describes Subazen’s contact process and does not make a legal determination about any report.",
};

const defaultSettings = {
  key: "storefront",
  brandName: "Subazen",
  description: "Shop online with Subazen in Pakistan.",
  email: "hafizahsanashfaq17@gmail.com",
  phone: "0300000000",
  whatsappNumber: "+923064652044",
  whatsappTemplates: [
    { label: "Ask about a product", message: "Hi Subazen Support, I’d like to know more about this product: " },
    { label: "Return or refund help", message: "Hi Subazen Support, I need help with a return or refund. My order number is: " },
    { label: "Request a custom quote", message: "Hi Subazen Support, I’d like a custom quote for this product: " },
    { label: "Other question", message: "Hi Subazen Support, I have a question: " },
  ],
  address: "Karim Park, Lahore, Pakistan",
  columns: [
    { title: "Shop", links: [{ label: "Browse products", url: "/" }, { label: "Search", url: "/search" }, { label: "Shopping cart", url: "/cart" }] },
    { title: "Your account", links: [{ label: "My orders", url: "/account/orders" }, { label: "Checkout", url: "/checkout" }] },
    { title: "Customer support", links: [{ label: "Contact Us", url: "/contact" }] },
  ],
  socialLinks: [],
  pages: [
    { slug: "about-us", title: "About Us", content: defaultPageContent["about-us"] },
    { slug: "privacy-policy", title: "Privacy Policy", content: defaultPageContent["privacy-policy"] },
    { slug: "return-policy", title: "Returns and Refunds", content: defaultPageContent["return-policy"] },
    { slug: "dmca", title: "DMCA", content: defaultPageContent.dmca },
  ],
  orderingNote: "Cash on Delivery is the available payment method. Shipping charges are shown before you place an order.",
  copyrightText: "Subazen",
};

const normalizeUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if ((url.startsWith("/") && !url.startsWith("//")) || /^https:\/\//i.test(url) || /^mailto:/i.test(url) || /^tel:/i.test(url)) return url;
  throw new Error("Links must be site paths or use HTTPS.");
};

const publishedPages = (settings) => defaultSettings.pages.map((defaultPage) => {
  const savedPage = (settings?.pages || []).find((page) => page.slug === defaultPage.slug);
  return { ...defaultPage, ...(savedPage || {}), content: String(savedPage?.content || "").trim() || defaultPage.content };
});

const persistPublishedPages = async (settings) => {
  const pages = publishedPages(settings);
  const needsPublish = defaultSettings.pages.some((page) => !(settings?.pages || []).find((saved) => saved.slug === page.slug)?.content?.trim());
  if (needsPublish) {
    await FooterSettings.updateOne({ key: "storefront" }, { $set: { pages } }, { upsert: true, setDefaultsOnInsert: true }).exec();
  }
  return pages;
};

const cleanSettings = (body) => {
  const email = String(body.email || "").trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid contact email address.");
  const columns = Array.isArray(body.columns) ? body.columns.slice(0, 6).map((column) => ({
    title: String(column.title || "").trim().slice(0, 80),
    links: (Array.isArray(column.links) ? column.links : []).slice(0, 12).map((link) => ({
      label: String(link.label || "").trim().slice(0, 80),
      url: normalizeUrl(link.url),
    })).filter((link) => link.label && link.url),
  })).filter((column) => column.title) : [];
  const socialLinks = Array.isArray(body.socialLinks) ? body.socialLinks.slice(0, 8).map((link) => ({
    label: String(link.label || "").trim().slice(0, 40),
    url: normalizeUrl(link.url),
  })).filter((link) => link.label && link.url) : [];
  const pageTitles = { "about-us": "About Us", "privacy-policy": "Privacy Policy", "return-policy": "Returns and Refunds", dmca: "DMCA" };
  const pages = Array.isArray(body.pages) ? body.pages
    .filter((page) => Object.prototype.hasOwnProperty.call(pageTitles, page.slug))
    .map((page) => ({ slug: page.slug, title: String(page.title || pageTitles[page.slug]).trim().slice(0, 120), content: String(page.content || "").trim().slice(0, 20000) || defaultPageContent[page.slug] })) : defaultSettings.pages;
  const whatsappNumber = String(body.whatsappNumber || defaultSettings.whatsappNumber).replace(/[^\d+]/g, "");
  if (!/^\+?\d{8,15}$/.test(whatsappNumber)) throw new Error("Enter a WhatsApp number with country code, such as +923001234567.");
  const whatsappTemplates = Array.isArray(body.whatsappTemplates) ? body.whatsappTemplates.slice(0, 8).map((template) => ({
    label: String(template.label || "").trim().slice(0, 80),
    message: String(template.message || "").trim().slice(0, 1000),
  })).filter((template) => template.label && template.message) : defaultSettings.whatsappTemplates;
  return {
    brandName: String(body.brandName || "Subazen").trim().slice(0, 100),
    description: String(body.description || "").trim().slice(0, 300),
    email,
    phone: String(body.phone || "").trim().slice(0, 40),
    whatsappNumber,
    whatsappTemplates,
    address: String(body.address || "").trim().slice(0, 300),
    columns,
    socialLinks,
    pages,
    orderingNote: String(body.orderingNote || "").trim().slice(0, 300),
    copyrightText: String(body.copyrightText || "Subazen").trim().slice(0, 160),
  };
};

exports.getPublicFooter = async (_req, res) => {
  try {
    const settings = await FooterSettings.findOne({ key: "storefront" }).lean().exec();
    const result = settings || defaultSettings;
    result.pages = await persistPublishedPages(result);
    return res.status(200).json({ settings: result });
  } catch (error) {
    console.error("Footer settings lookup failed:", error.message);
    return res.status(500).json({ message: "Could not load store footer" });
  }
};

exports.getFooterSettings = async (_req, res) => {
  try {
    const settings = await FooterSettings.findOneAndUpdate(
      { key: "storefront" },
      { $setOnInsert: defaultSettings },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    ).lean().exec();
    settings.pages = await persistPublishedPages(settings);
    return res.status(200).json({ settings });
  } catch (error) {
    console.error("Footer settings load failed:", error.message);
    return res.status(500).json({ message: "Could not load footer settings" });
  }
};

exports.updateFooterSettings = async (req, res) => {
  try {
    const settings = cleanSettings(req.body || {});
    const saved = await FooterSettings.findOneAndUpdate(
      { key: "storefront" },
      { $set: settings, $setOnInsert: { key: "storefront" } },
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean().exec();
    return res.status(200).json({ settings: saved, message: "Footer settings saved." });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not save footer settings" });
  }
};
