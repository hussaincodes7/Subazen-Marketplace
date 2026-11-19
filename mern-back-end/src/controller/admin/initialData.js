const Category = require("../../models/category");
const Product = require("../../models/product");
const categoryTypes = new Set(['page', 'store', 'product']);
const { inferCategoryType } = require('../../utils/categoryType');
function createCategories(categories){
    const categoryList = categories.map(category => ({
        _id: category._id,
        name: category.name,
        slug: category.slug,
        type: categoryTypes.has(category.type) ? category.type : '',
        parentId: category.parentId,
        categoryImage: category.categoryImage,
        children: []
    }));
    const categoriesById = new Map(categoryList.map(category => [String(category._id), category]));
    const rootCategories = [];

    for (const category of categoryList) {
        const parent = category.parentId
            ? categoriesById.get(String(category.parentId))
            : null;

        if (parent && parent !== category) {
            parent.children.push(category);
        } else {
            rootCategories.push(category);
        }
    }

    const applyInheritedTypes = (items, parentType = '') => {
        for (const item of items) {
            item.type = item.type || parentType || inferCategoryType(item.name);
            applyInheritedTypes(item.children, item.type);
        }
    };
    applyInheritedTypes(rootCategories);

    return rootCategories;
}
exports.initialData = async (req, res) => {
  try {
    const [categories, products] = await Promise.all([
      Category.find({})
        .select("_id name slug type parentId categoryImage")
        .lean()
        .exec(),
      Product.find({})
        .select("_id name price quantity slug description productPictures featuredImageIndex sizes colors category")
        .populate({ path: "category", select: "_id name" })
        .lean()
        .exec(),
    ]);
    return res.status(200).json({
      categories: createCategories(categories),
      products,
    });
  } catch (error) {
    console.error("Initial data lookup failed:", error.message);
    return res.status(500).json({ message: "Could not load initial data" });
  }
};
