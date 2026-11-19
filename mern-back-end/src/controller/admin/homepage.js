const Homepage = require("../../models/homepage");
const Category = require("../../models/category");

const getOrCreate = async () => {
  let layout = await Homepage.findOne({ key: "storefront" }).exec();
  if (!layout) layout = await Homepage.create({ key: "storefront", sections: [] });
  return layout;
};

exports.getHomepage = async (_req, res) => {
  try {
    const layout = await getOrCreate();
    return res.status(200).json({ layout });
  } catch (error) {
    console.error("Homepage load failed:", error.message);
    return res.status(500).json({ message: "Could not load homepage layout" });
  }
};

exports.getPublishedHomepage = async (_req, res) => {
  try {
    const layout = await Homepage.findOne({ key: "storefront", published: true })
      .populate("sections.productIds", "_id name slug price quantity offer discountEnabled dealEnabled dealLabel sizes colors productPictures featuredImageIndex category")
      .populate("sections.spotlightCards.productId", "_id name slug price quantity offer discountEnabled productPictures featuredImageIndex")
      .populate("sections.categoryIds", "_id name slug categoryImage type")
      .lean()
      .exec();
    const sections = (layout?.sections || []).filter((section) => section.enabled).sort((a, b) => a.order - b.order);
    const allCategories = await Category.find({}).select("_id name slug parentId").lean().exec();
    const categoryById = new Map(allCategories.map((category) => [String(category._id), category]));
    const getPath = (category) => {
      const pathItems = [];
      let current = category;
      const visited = new Set();
      while (current && !visited.has(String(current._id))) {
        visited.add(String(current._id));
        pathItems.unshift({ _id: current._id, name: current.name, slug: current.slug });
        current = current.parentId ? categoryById.get(String(current.parentId)) : null;
      }
      return pathItems;
    };
    sections.forEach((section) => (section.categoryIds || []).forEach((category) => { category.path = getPath(categoryById.get(String(category._id)) || category); }));
    return res.status(200).json({ sections });
  } catch (error) {
    console.error("Published homepage load failed:", error.message);
    return res.status(500).json({ message: "Could not load homepage" });
  }
};

exports.updateHomepage = async (req, res) => {
  try {
    let sections;
    try { sections = JSON.parse(req.body?.sections || "[]"); }
    catch { return res.status(400).json({ message: "Homepage sections must be valid JSON." }); }
    if (!Array.isArray(sections)) return res.status(400).json({ message: "Homepage sections must be a list." });
    const allowedTypes = new Set(["banner", "products", "recommended", "spotlight", "categories", "text"]);
    const files = Array.isArray(req.files) ? req.files : [];
    const current = await getOrCreate();
    const apiBase = String(process.env.API || "http://localhost:2000").replace(/\/api\/?$/, "").replace(/\/$/, "");
    const nextSections = sections.map((section, index) => {
      if (!allowedTypes.has(section.type)) throw new Error(`Section ${index + 1} has an invalid type.`);
      const existing = section._id ? current.sections.id(section._id) : null;
      const imageFile = files.find((file) => file.fieldname === `sectionImage_${index}`);
      const mobileFile = files.find((file) => file.fieldname === `sectionMobileImage_${index}`);
      const spotlightCards = section.type === "spotlight" ? (Array.isArray(section.spotlightCards) ? section.spotlightCards : []).slice(0, 24).map((card, cardIndex) => {
        const cardImage = files.find((file) => file.fieldname === `sectionSpotlightImage_${index}_${cardIndex}`);
        if (!card.productId) throw new Error(`Choose a product for Spotlight card ${cardIndex + 1} in section ${index + 1}.`);
        if (!cardImage && !card.image) throw new Error(`Upload an image for Spotlight card ${cardIndex + 1} in section ${index + 1}.`);
        return { productId: card.productId, image: cardImage ? `${apiBase}/public/${cardImage.filename}` : String(card.image || "") };
      }) : [];
      const requestedCardWidth = Number(section.cardWidth || 220);
      if (section.type === "spotlight" && (!Number.isFinite(requestedCardWidth) || requestedCardWidth < 140 || requestedCardWidth > 360)) throw new Error(`Section ${index + 1} card width must be between 140 and 360 pixels.`);
      return {
        type: section.type,
        title: String(section.title || "").trim().slice(0, 140),
        description: String(section.description || "").trim().slice(0, 1000),
        image: imageFile ? `${apiBase}/public/${imageFile.filename}` : String(section.image ?? existing?.image ?? ""),
        mobileImage: mobileFile ? `${apiBase}/public/${mobileFile.filename}` : String(section.mobileImage ?? existing?.mobileImage ?? ""),
        buttonText: String(section.buttonText || "").trim().slice(0, 60),
        href: String(section.href || "").trim().slice(0, 500),
        productIds: Array.isArray(section.productIds) ? section.productIds : [],
        spotlightCards,
        cardWidth: Math.round(requestedCardWidth),
        categoryIds: Array.isArray(section.categoryIds) ? section.categoryIds : [],
        layout: section.layout === "slider" ? "slider" : "grid",
        enabled: section.enabled !== false,
        order: index,
      };
    });
    current.sections = nextSections;
    current.published = req.body?.published !== "false";
    await current.save();
    return res.status(200).json({ layout: current });
  } catch (error) {
    const status = error.name === "ValidationError" || error.name === "CastError" ? 400 : 400;
    return res.status(status).json({ message: error.message || "Could not save homepage layout" });
  }
};
