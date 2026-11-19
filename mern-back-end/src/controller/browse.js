const Category = require("../models/category");
const Brand = require("../models/brand");
const Product = require("../models/product");
const PriceCollection = require("../models/priceCollection");

exports.browse = async (req, res) => {
  try {
    const segments = String(req.query.path || "").split("/").map((item) => decodeURIComponent(item).trim().toLowerCase()).filter(Boolean);
    if (!segments.length) return res.status(400).json({ message: "A category path is required." });
    const categories = [];
    let parentId = null;
    let unmatched = "";
    for (const segment of segments) {
      // Older categories may have mixed-case slugs; public URLs are normalized to lowercase.
      const escapedSegment = segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const categoryProjection = "_id name slug parentId type categoryImage coverImage iconKey showOnHome displayOrder";
      // Normal generated URLs are lowercase, so keep the indexed equality lookup
      // on the hot path. Preserve a case-insensitive fallback for legacy slugs.
      const category = await Category.findOne({ slug: segment, parentId, isActive: { $ne: false } }).select(categoryProjection).lean().exec()
        || await Category.findOne({ slug: { $regex: `^${escapedSegment}$`, $options: "i" }, parentId, isActive: { $ne: false } }).select(categoryProjection).lean().exec();
      if (!category) { unmatched = segment; break; }
      categories.push(category); parentId = String(category._id);
    }
    let brand = null;
    if (unmatched && categories.length === segments.length - 1) {
      brand = await Brand.findOne({ slug: unmatched, categoryIds: categories[categories.length - 1]._id, isActive: { $ne: false } }).select("_id name slug logo").lean().exec();
      if (!brand) return res.status(404).json({ message: "Category or brand not found." });
    } else if (unmatched) return res.status(404).json({ message: "Category not found." });
    const category = categories[categories.length - 1];
    const childCategories = await Category.find({ parentId: String(category._id), isActive: { $ne: false } }).select("_id name slug parentId type categoryImage coverImage iconKey displayOrder").sort({ displayOrder: 1, name: 1 }).lean().exec();
    const brands = brand ? [] : await Brand.find({ categoryIds: category._id, isActive: { $ne: false } }).select("_id name slug logo displayOrder").sort({ displayOrder: 1, name: 1 }).lean().exec();
    const priceCollections = brand ? [] : await PriceCollection.find({ categoryId: category._id, isActive: true }).populate("brandId", "name slug logo").sort({ displayOrder: 1, title: 1 }).lean().exec();
    // Walk only the category tree under this node. Loading every category and
    // repeatedly scanning it made each category request O(total category count).
    const descendantIds = new Set([String(category._id)]);
    let frontier = [String(category._id)];
    while (frontier.length) {
      const children = await Category.find({ parentId: { $in: frontier }, isActive: { $ne: false } }).select("_id").lean().exec();
      frontier = children.map((item) => String(item._id)).filter((id) => !descendantIds.has(id));
      frontier.forEach((id) => descendantIds.add(id));
    }
    const categoryIds = [...descendantIds];
    const query = { isActive: { $ne: false }, category: { $in: categoryIds } };
    if (brand) query.$or = [{ brandId: brand._id }, { brandId: { $exists: false }, brand: new RegExp(`^${brand.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }];
    if (!brand && req.query.brand) {
      const selectedBrand = await Brand.findOne({ slug: String(req.query.brand).toLowerCase(), categoryIds: category._id, isActive: { $ne: false } }).select("_id").lean().exec();
      if (selectedBrand) query.brandId = selectedBrand._id;
      else query._id = null;
    }
    if (req.query.stock === "in") query.quantity = { $gt: 0 };
    const price = {};
    const minPrice = Number(req.query.minPrice); const maxPrice = Number(req.query.maxPrice);
    if (req.query.minPrice !== undefined && Number.isFinite(minPrice)) price.$gte = Math.max(0, minPrice);
    if (req.query.maxPrice !== undefined && Number.isFinite(maxPrice)) price.$lte = Math.max(0, maxPrice);
    if (Object.keys(price).length) query.price = price;
    const sort = req.query.sort === "price-asc" ? { price: 1, _id: 1 } : req.query.sort === "price-desc" ? { price: -1, _id: -1 } : { createdAt: -1, _id: -1 };
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1); const limit = Math.min(60, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const [products, total] = await Promise.all([
      Product.find(query).populate("category", "name slug").populate("brandId", "name slug logo").sort(sort).skip((page - 1) * limit).limit(limit).lean().exec(),
      Product.countDocuments(query).exec(),
    ]);
    return res.json({ category, categoryPath: categories, childCategories, brands, priceCollections, brand, products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Category browse failed:", error);
    return res.status(500).json({ message: "Could not load this category.", ...(process.env.NODE_ENV !== "production" ? { debug: error.message } : {}) });
  }
};
