const Page = require("../../models/page");
const mongoose = require("mongoose");

exports.createPage = async (req, res) => {
  try {
    const { banners = [], products = [] } = req.files || {};
    const pageData = { ...req.body };
    pageData.title = String(pageData.title || "").trim();
    pageData.description = String(pageData.description || "").trim();
    if (!pageData.title) return res.status(400).json({ message: "Page title is required." });
    if (!pageData.description) return res.status(400).json({ message: "Page description is required." });
    if (!mongoose.isValidObjectId(pageData.category)) return res.status(400).json({ message: "Select a valid page category." });

    if (banners.length > 0) {
      pageData.banners = banners.map((banner) => ({
        img: `/public/${banner.filename}`,
        navigateTo: `/bannerClicked?categoryId=${req.body.category}&type=${req.body.type}`,
      }));
    }
    if (products.length > 0) {
      pageData.products = products.map((product) => ({
        img: `/public/${product.filename}`,
        navigateTo: `/productClicked?categoryId=${req.body.category}&type=${req.body.type}`,
      }));
    }

    pageData.createdBy = req.auth.userId;

    const page = await Page.findOneAndUpdate(
      { category: pageData.category },
      { $set: pageData },
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).exec();
    return res.status(201).json({ page, message: "Page saved successfully." });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getPage = async (req, res) => {
  const { category, type } = req.params;
  if (type === "page") {
    try {
      const page = await Page.findOne({ category }).exec();
      if (!page) return res.status(404).json({ error: 'Page not found' });
      return res.status(200).json({ page });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
  return res.status(400).json({ error: 'Invalid page type' });
};
