const mongoose = require("mongoose");
const slugify = require("slugify");
const shortid = require("shortid");
const Category = require("../models/category");
const Brand = require("../models/brand");
const Product = require("../models/product");
const PriceCollection = require("../models/priceCollection");

async function uniqueSlug(title, excludeId) {
  const base = slugify(title, { lower: true, strict: true }) || "collection"; let slug = base; let n = 1;
  while (await PriceCollection.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${base}-${n++}-${shortid.generate().slice(0, 4)}`;
  return slug;
}
async function readFields(body, existing = {}) {
  const title = String(body.title || "").trim(); const categoryId = String(body.categoryId || "").trim();
  const minPrice = body.minPrice === "" || body.minPrice == null ? 0 : Number(body.minPrice); const maxPrice = Number(body.maxPrice);
  if (!title) throw new Error("Collection heading is required.");
  if (!mongoose.isValidObjectId(categoryId)) throw new Error("Choose a product category.");
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice < 0 || maxPrice <= minPrice) throw new Error("Enter a valid PKR price range; the maximum must be higher than the minimum.");
  const category = await Category.findOne({ _id: categoryId, type: "product", isActive: { $ne: false } }).select("_id").lean().exec();
  if (!category) throw new Error("The selected product category is unavailable.");
  let brandId = body.brandId ? String(body.brandId) : null;
  if (brandId) {
    if (!mongoose.isValidObjectId(brandId)) throw new Error("Choose a valid brand.");
    const brand = await Brand.findOne({ _id: brandId, categoryIds: categoryId, isActive: { $ne: false } }).select("_id").lean().exec();
    if (!brand) throw new Error("Choose a brand assigned to the selected category.");
  }
  return { title, slug: await uniqueSlug(title, existing._id), categoryId, brandId, minPrice, maxPrice, displayOnHome: body.displayOnHome === "true", displayOrder: Math.max(0, Number(body.displayOrder) || 0), isActive: body.isActive !== "false" };
}

exports.adminList = async (_req, res) => {
  try { return res.json({ collections: await PriceCollection.find({}).populate("categoryId", "name slug").populate("brandId", "name slug").sort({ displayOrder: 1, title: 1 }).lean().exec() }); }
  catch { return res.status(500).json({ message: "Could not load price collections." }); }
};
exports.publicList = async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.homepage === "true") query.displayOnHome = true;
    if (req.query.categoryId && mongoose.isValidObjectId(req.query.categoryId)) query.categoryId = req.query.categoryId;
    const collections = await PriceCollection.find(query).populate("categoryId", "name slug parentId").populate("brandId", "name slug logo").sort({ displayOrder: 1, title: 1 }).lean().exec();
    return res.json({ collections });
  } catch { return res.status(500).json({ message: "Could not load price collections." }); }
};
exports.create = async (req, res) => {
  try { const collection = await PriceCollection.create(await readFields(req.body)); return res.status(201).json({ collection }); }
  catch (error) { return res.status(400).json({ message: error.message }); }
};
exports.update = async (req, res) => {
  try {
    const existing = await PriceCollection.findById(req.params.collectionId).exec();
    if (!existing) return res.status(404).json({ message: "Price collection not found." });
    Object.assign(existing, await readFields(req.body, existing)); await existing.save();
    return res.json({ collection: existing });
  } catch (error) { return res.status(400).json({ message: error.message }); }
};
exports.remove = async (req, res) => {
  try { const deleted = await PriceCollection.findByIdAndDelete(req.params.collectionId).exec(); return deleted ? res.json({ message: "Price collection deleted." }) : res.status(404).json({ message: "Price collection not found." }); }
  catch { return res.status(500).json({ message: "Could not delete price collection." }); }
};
exports.products = async (req, res) => {
  try {
    const collection = await PriceCollection.findOne({ slug: req.params.slug, isActive: true }).populate("categoryId", "name slug parentId").populate("brandId", "name slug logo").lean().exec();
    if (!collection) return res.status(404).json({ message: "Collection not found." });
    const allCategories = await Category.find({ isActive: { $ne: false } }).select("_id parentId").lean().exec();
    const categoryIds = new Set([String(collection.categoryId._id)]); let changed = true;
    while (changed) { changed = false; for (const node of allCategories) if (node.parentId && categoryIds.has(String(node.parentId)) && !categoryIds.has(String(node._id))) { categoryIds.add(String(node._id)); changed = true; } }
    const query = { isActive: { $ne: false }, category: { $in: [...categoryIds] }, price: { $gt: collection.minPrice, $lte: collection.maxPrice } };
    if (collection.brandId) query.brandId = collection.brandId._id;
    if (req.query.stock === "in") query.quantity = { $gt: 0 };
    const sort = req.query.sort === "price-asc" ? { price: 1, _id: 1 } : req.query.sort === "price-desc" ? { price: -1, _id: -1 } : { createdAt: -1, _id: -1 };
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1); const limit = Math.min(60, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const [products, total] = await Promise.all([Product.find(query).populate("category", "name slug").populate("brandId", "name slug logo").sort(sort).skip((page - 1) * limit).limit(limit).lean().exec(), Product.countDocuments(query).exec()]);
    return res.json({ collection, products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch { return res.status(500).json({ message: "Could not load this price collection." }); }
};
