const Category = require("../models/category");

const isPrintingCategory = (category) => {
  const values = [category?.name, category?.slug].map((value) => String(value || "").trim().toLowerCase());
  if (values.some((value) => value === "printing-and-custom-products" || value.replace(/[^a-z0-9]/g, "") === "printingandcustomproducts")) return true;
  const label = `${category?.name || ""} ${category?.slug || ""}`.toLowerCase();
  return /(^|[^a-z])printing([^a-z]|$)/.test(label) || /custom[\s-]*(?:print(?:ed|ing)?|products?)/.test(label);
};
exports.isPrintingCategory = isPrintingCategory;

exports.productRequiresDesign = async (product) => {
  // Artwork is optional and must be explicitly enabled for each product by Admin.
  return product?.requiresCustomerDesign === true;
};

exports.productIsCustomPrintingCategory = async (product) => {
  let category = product?.category && typeof product.category === "object" && (product.category.name || product.category.slug)
    ? product.category
    : await Category.findById(product?.category).select("_id name slug parentId").lean().exec();
  const seen = new Set();
  while (category && !seen.has(String(category._id))) {
    if (isPrintingCategory(category)) return true;
    seen.add(String(category._id));
    category = category.parentId
      ? await Category.findById(category.parentId).select("_id name slug parentId").lean().exec()
      : null;
  }
  return false;
};

exports.normalizeDesignImage = (value) => {
  const filename = String(value || "").split("/").pop().split("?")[0];
  if (!/^[A-Za-z0-9_-]{6,80}\.(?:png|jpe?g|webp|pdf)$/i.test(filename)) return "";
  return `/public/${encodeURIComponent(filename)}`;
};
