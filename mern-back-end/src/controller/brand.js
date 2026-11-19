const mongoose = require("mongoose");
const slugify = require("slugify");
const Brand = require("../models/brand");
const Category = require("../models/category");
const Product = require("../models/product");
const fs = require("fs");
const shortid = require("shortid");

const removeUpload = (file) => file?.path ? fs.promises.unlink(file.path).catch(() => {}) : Promise.resolve();

async function uniqueSlug(name, excludeId) {
  const base = slugify(name, { lower: true, strict: true }) || "brand";
  let slug = base;
  let suffix = 1;
  while (await Brand.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${base}-${suffix++}-${shortid.generate().slice(0, 4)}`;
  return slug;
}

async function parseCategories(value) {
  let ids = value;
  if (typeof ids === "string") ids = JSON.parse(ids || "[]");
  if (!Array.isArray(ids)) throw new Error("Choose one or more product categories for this brand.");
  ids = [...new Set(ids.map(String).filter(Boolean))];
  if (ids.some((id) => !mongoose.isValidObjectId(id))) throw new Error("One or more selected categories are invalid.");
  if (!ids.length) throw new Error("Assign this brand to at least one product type.");
  const categories = await Category.find({ _id: { $in: ids }, type: "product", isActive: { $ne: false } }).select("_id").lean().exec();
  if (categories.length !== ids.length) throw new Error("Brands can only be assigned to active product categories.");
  return ids;
}

exports.adminList = async (_req, res) => {
  try {
    const brands = await Brand.find({}).populate("categoryIds", "name slug").sort({ displayOrder: 1, name: 1 }).lean().exec();
    return res.json({ brands });
  } catch (error) { return res.status(500).json({ message: "Could not load brands." }); }
};

exports.publicList = async (req, res) => {
  try {
    const filter = { isActive: { $ne: false } };
    if (req.query.categoryId) {
      if (!mongoose.isValidObjectId(req.query.categoryId)) return res.status(400).json({ message: "Invalid product category." });
      filter.categoryIds = req.query.categoryId;
    }
    const brands = await Brand.find(filter).select("name slug logo categoryIds displayOrder").sort({ displayOrder: 1, name: 1 }).lean().exec();
    return res.json({ brands });
  } catch (error) { return res.status(500).json({ message: "Could not load brands." }); }
};

exports.create = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) { await removeUpload(req.file); return res.status(400).json({ message: "Brand name is required." }); }
    const categoryIds = await parseCategories(req.body.categoryIds);
    const brand = await Brand.create({ name, slug: await uniqueSlug(name), categoryIds, logo: req.file ? `${process.env.API}/public/${req.file.filename}` : "", displayOrder: Math.max(0, Number(req.body.displayOrder) || 0), isActive: req.body.isActive !== "false" });
    return res.status(201).json({ brand });
  } catch (error) { await removeUpload(req.file); return res.status(400).json({ message: error.message }); }
};

exports.update = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.brandId)) { await removeUpload(req.file); return res.status(400).json({ message: "Invalid brand." }); }
    const brand = await Brand.findById(req.params.brandId).exec();
    if (!brand) { await removeUpload(req.file); return res.status(404).json({ message: "Brand not found." }); }
    const name = String(req.body.name || "").trim();
    if (!name) { await removeUpload(req.file); return res.status(400).json({ message: "Brand name is required." }); }
    brand.name = name;
    brand.slug = await uniqueSlug(name, brand._id);
    brand.categoryIds = await parseCategories(req.body.categoryIds);
    brand.displayOrder = Math.max(0, Number(req.body.displayOrder) || 0);
    brand.isActive = req.body.isActive !== "false";
    if (req.file) brand.logo = `${process.env.API}/public/${req.file.filename}`;
    await brand.save();
    return res.json({ brand });
  } catch (error) { await removeUpload(req.file); return res.status(400).json({ message: error.message }); }
};

exports.remove = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.brandId)) return res.status(400).json({ message: "Invalid brand." });
    const brand = await Brand.findById(req.params.brandId).lean().exec();
    if (!brand) return res.status(404).json({ message: "Brand not found." });
    const usageCount = await Product.countDocuments({ brandId: brand._id }).exec();
    if (usageCount) return res.status(409).json({ message: `This brand is assigned to ${usageCount} product(s). Reassign those products before deleting it.` });
    await Brand.deleteOne({ _id: brand._id }).exec();
    return res.json({ message: "Brand deleted." });
  } catch (error) { return res.status(500).json({ message: "Could not delete brand." }); }
};

// Converts a legacy brand-category node only when product names or their saved brand field
// independently corroborate that the node is a brand. The old category record is retained.
exports.migrateMatchingCategories = async (_req, res) => {
  try {
    const candidates = await Category.find({ parentId: { $ne: null }, type: "product" }).select("_id name parentId categoryImage isActive").lean().exec();
    let brandsCreated = 0; let productsMoved = 0; let legacyNodesHidden = 0;
    for (const legacyNode of candidates) {
      const parent = await Category.findById(legacyNode.parentId).select("_id type").lean().exec();
      if (!parent || parent.type !== "product") continue;
      const escapedName = legacyNode.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const assignedProducts = await Product.find({ category: legacyNode._id }).select("_id name brand").lean().exec();
      const productNameMatch = new RegExp(`(^|[^a-z0-9])${escapedName}([^a-z0-9]|$)`, "i");
      const matchingProducts = assignedProducts.filter((product) => (product.brand && product.brand.toLowerCase() === legacyNode.name.toLowerCase()) || productNameMatch.test(product.name || ""));
      if (!matchingProducts.length) continue;
      const slug = slugify(legacyNode.name, { lower: true, strict: true }) || "brand";
      let brand = await Brand.findOne({ slug }).exec();
      if (!brand) {
        brand = await Brand.create({ name: legacyNode.name, slug: await uniqueSlug(legacyNode.name), logo: legacyNode.categoryImage || "", categoryIds: [parent._id] });
        brandsCreated += 1;
      } else if (!(brand.categoryIds || []).some((id) => String(id) === String(parent._id))) {
        brand.categoryIds.push(parent._id);
        if (!brand.logo && legacyNode.categoryImage) brand.logo = legacyNode.categoryImage;
        await brand.save();
      }
      const result = await Product.updateMany({ _id: { $in: matchingProducts.filter((item) => !item.brand || item.brand.toLowerCase() === legacyNode.name.toLowerCase()).map((item) => item._id) } }, { $set: { category: parent._id, brandId: brand._id, brand: legacyNode.name } }).exec();
      productsMoved += result.modifiedCount || 0;
      if (await Product.countDocuments({ category: legacyNode._id }).exec() === 0) {
        await Category.updateOne({ _id: legacyNode._id }, { $set: { isActive: false } }).exec();
        legacyNodesHidden += 1;
      }
    }
    return res.json({ message: `Moved ${productsMoved} matching product(s) into their product types and linked brands. Legacy category records were kept.`, brandsCreated, productsMoved, legacyNodesHidden });
  } catch (error) { return res.status(500).json({ message: "Could not migrate legacy brand categories." }); }
};

exports.products = async (req, res) => {
  try {
    const brand = await Brand.findOne({ slug: req.params.slug, isActive: { $ne: false } }).lean().exec();
    if (!brand) return res.status(404).json({ message: "Brand not found." });
    const allowedCategoryIds = (brand.categoryIds || []).map(String);
    let category = null;
    if (req.query.categorySlug) {
      category = await Category.findOne({ slug: req.query.categorySlug, isActive: { $ne: false } }).lean().exec();
      if (!category || !allowedCategoryIds.includes(String(category._id))) return res.status(404).json({ message: "This brand is not listed for that category." });
    }
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(60, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const query = { isActive: { $ne: false }, $or: [{ brandId: brand._id }, { brandId: { $exists: false }, brand: new RegExp(`^${brand.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }] };
    if (category) query.category = category._id;
    else query.category = { $in: allowedCategoryIds };
    if (req.query.inStock === "true") query.quantity = { $gt: 0 };
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) query.price = { ...(Number.isFinite(minPrice) ? { $gte: minPrice } : {}), ...(Number.isFinite(maxPrice) ? { $lte: maxPrice } : {}) };
    const sort = req.query.sort === "price-asc" ? { price: 1 } : req.query.sort === "price-desc" ? { price: -1 } : { createdAt: -1, _id: -1 };
    const [products, total] = await Promise.all([Product.find(query).populate("category", "name slug").populate("brandId", "name slug logo").sort(sort).skip((page - 1) * limit).limit(limit).lean().exec(), Product.countDocuments(query).exec()]);
    return res.json({ brand: { _id: brand._id, name: brand.name, slug: brand.slug, logo: brand.logo }, category, products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return res.status(500).json({ message: "Could not load brand products." }); }
};
