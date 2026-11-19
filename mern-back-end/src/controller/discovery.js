const Category = require("../models/category");
const Product = require("../models/product");
const Brand = require("../models/brand");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const synonyms = {
  mobile: ["phone", "smartphone", "cellphone"], phone: ["mobile", "smartphone", "cellphone"], cellphone: ["mobile", "phone", "smartphone"], smartphone: ["mobile", "phone"],
  fridge: ["refrigerator"], refrigerator: ["fridge"], ac: ["air conditioner", "air conditioning"], "air conditioner": ["ac", "air conditioning"],
  washer: ["washing machine"], "washing machine": ["washer"], kapray: ["kapre", "clothes", "clothing"], kapre: ["kapray", "clothes", "clothing"], clothes: ["kapray", "kapre", "clothing"],
  shirt: ["tshirt", "t-shirt"], tshirt: ["shirt", "t-shirt"], "t-shirt": ["shirt", "tshirt"], shawl: ["dupatta"], dupatta: ["shawl"],
  laptop: ["notebook computer"], tv: ["television"], television: ["tv"], fan: ["ceiling fan"],
};
const intentWords = new Set(["best", "cheap", "cheapest", "affordable", "budget", "buy", "shop", "price", "prices", "online", "in", "pakistan", "for", "under", "below", "less", "than", "upto", "up", "to", "pkr", "rs"]);
exports.searchProducts = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim().slice(0, 100);
    if (query.length < 2) return res.status(200).json({ products: [], suggestions: [] });
    const priceIntent = query.match(/\b(?:under|below|less than|up to|upto|max(?:imum)?)\s*(?:rs\.?|pkr)?\s*([\d,]+)/i);
    const numericPrice = priceIntent ? Number(priceIntent[1].replace(/,/g, "")) : null;
    const words = query.toLowerCase().replace(/[,]/g, " ").split(/\s+/).filter((word) => word && !intentWords.has(word) && !/^\d+(?:\.\d+)?$/.test(word));
    const expandedWords = words.flatMap((word) => synonyms[word] || []);
    const phraseSynonyms = Object.entries(synonyms).filter(([phrase]) => query.toLowerCase().includes(phrase)).flatMap(([, alternatives]) => alternatives);
    const terms = [...new Set([query, ...words, ...expandedWords, ...phraseSynonyms])];
    const regexes = terms.map((term) => new RegExp(escapeRegex(term), "i"));
    const [matchingCategories, matchingBrands] = await Promise.all([
      Category.find({ name: { $in: regexes }, isActive: { $ne: false } }).select("_id").limit(100).lean().exec(),
      Brand.find({ name: { $in: regexes }, isActive: { $ne: false } }).select("_id").limit(100).lean().exec(),
    ]);
    const categoryIds = matchingCategories.map((category) => category._id);
    const brandIds = matchingBrands.map((brand) => brand._id);
    const filter = { isActive: { $ne: false }, $or: [...regexes.flatMap((regex) => [{ name: regex }, { description: regex }, { brand: regex }, { tags: regex }, { "colors.colorName": regex }, { "sizes.size": regex }, { "colors.sizes.size": regex }, { "specifications.name": regex }, { "specifications.value": regex }]), ...(categoryIds.length ? [{ category: { $in: categoryIds } }] : []), ...(brandIds.length ? [{ brandId: { $in: brandIds } }] : [])] };
    if (Number.isFinite(numericPrice) && numericPrice > 0) filter.price = { $lte: numericPrice };
    const products = await Product.find(filter).select("name slug price quantity offer discountEnabled dealEnabled dealLabel productPictures featuredImageIndex sizes colors specifications category brand brandId tags").populate("category", "_id name slug").populate("brandId", "_id name slug").limit(100).lean().exec();
    const scored = products.map((product) => {
      const name = product.name.toLowerCase();
      const q = query.toLowerCase();
      let score = name === q ? 100 : name.startsWith(q) ? 60 : name.includes(q) ? 35 : 0;
      if ((product.brand || product.brandId?.name) && `${product.brand || ""} ${product.brandId?.name || ""}`.toLowerCase().includes(q)) score += 20;
      if (product.category?.name?.toLowerCase() === q) score += 45;
      else if (product.category?.name?.toLowerCase().includes(q)) score += 18;
      if ((product.tags || []).some((tag) => tag.includes(q))) score += 12;
      const searchableDetails = [...(product.colors || []).map((item) => item.colorName), ...(product.sizes || []).map((item) => item.size), ...(product.colors || []).flatMap((item) => (item.sizes || []).map((size) => size.size)), ...(product.specifications || []).flatMap((item) => [item.name, item.value])].map((value) => String(value || "").toLowerCase());
      const tokenHits = words.filter((word) => [name, (product.description || "").toLowerCase(), (product.category?.name || "").toLowerCase(), (product.brand || "").toLowerCase(), (product.brandId?.name || "").toLowerCase(), ...(product.tags || []).map((tag) => String(tag).toLowerCase()), ...searchableDetails].some((field) => field.includes(word))).length;
      score += tokenHits * 10;
      if ((product.description || "").toLowerCase().includes(q)) score += 5;
      return { product, score };
    }).sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
    return res.status(200).json({ products: scored.slice(0, 24).map((entry) => entry.product), suggestions: [...new Set(scored.slice(0, 6).map((entry) => entry.product.name))] });
  } catch (error) { return res.status(500).json({ message: "Could not search products" }); }
};
exports.getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.productId, isActive: { $ne: false } }).select("name brand category tags").lean().exec();
    if (!product) return res.status(404).json({ message: "Product not found" });
    const category = await Category.findById(product.category).select("_id name parentId").lean().exec();
    const siblingCategories = category?.parentId
      ? await Category.find({ parentId: category.parentId, _id: { $ne: category._id } }).select("_id name").lean().exec()
      : [];
    const siblingCategoryIds = siblingCategories.map((item) => item._id);
    const candidates = await Product.find({
      _id: { $ne: product._id },
      isActive: { $ne: false },
      $or: [{ category: product.category }, ...(siblingCategoryIds.length ? [{ category: { $in: siblingCategoryIds } }] : [])]
    }).select("name slug price quantity offer discountEnabled dealEnabled dealLabel productPictures featuredImageIndex sizes colors category brand tags")
      .populate("category", "_id name")
      .limit(100)
      .lean()
      .exec();

    const sourceTags = new Set((product.tags || []).map((tag) => String(tag).toLowerCase()));
    const sourceBrand = String(product.brand || "").trim().toLowerCase();
    const ranked = candidates.map((candidate) => {
      const exactCategory = String(candidate.category?._id) === String(product.category);
      const sharedTags = (candidate.tags || []).reduce((count, tag) => count + (sourceTags.has(String(tag).toLowerCase()) ? 1 : 0), 0);
      return {
        candidate,
        exactCategory,
        baseScore: (exactCategory ? 120 : 70) + Math.min(sharedTags, 3) * 8
      };
    });

    // Greedily balance brand and product-type variety while keeping the closest matches first.
    const related = [];
    const brandCounts = new Map();
    const typeCounts = new Map();
    while (ranked.length && related.length < 8) {
      let bestIndex = 0;
      let bestScore = -Infinity;
      ranked.forEach((entry, index) => {
        const brandKey = String(entry.candidate.brand || "").trim().toLowerCase() || "unbranded";
        const typeKey = String(entry.candidate.category?._id || "");
        const sameAsSourceBrand = sourceBrand && brandKey === sourceBrand;
        const score = entry.baseScore
          - (brandCounts.get(brandKey) || 0) * 55
          - (typeCounts.get(typeKey) || 0) * 8
          - (sameAsSourceBrand ? 18 : 0);
        if (score > bestScore) { bestScore = score; bestIndex = index; }
      });
      const [chosen] = ranked.splice(bestIndex, 1);
      related.push(chosen.candidate);
      const brandKey = String(chosen.candidate.brand || "").trim().toLowerCase() || "unbranded";
      const typeKey = String(chosen.candidate.category?._id || "");
      brandCounts.set(brandKey, (brandCounts.get(brandKey) || 0) + 1);
      typeCounts.set(typeKey, (typeCounts.get(typeKey) || 0) + 1);
    }
    return res.status(200).json({ products: related });
  } catch (error) { return res.status(500).json({ message: "Could not load related products" }); }
};
