


const Category = require('../models/category');
const Product = require('../models/product');
const Brand = require('../models/brand');
const slugify = require('slugify');
const mongoose = require('mongoose');
const fs = require('fs');
const categoryTypes = new Set(['page', 'store', 'product']);
const { inferCategoryType } = require('../utils/categoryType');
const shortid = require('shortid');

async function uniqueCategorySlug(name, excludeId) {
    const base = slugify(name, { lower: true, strict: true }) || 'category';
    let slug = base;
    const filter = () => ({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    while (await Category.exists(filter())) slug = `${base}-${shortid.generate()}`;
    return slug;
}

const removeUploadedFile = async (file) => {
    if (file?.path) {
        await fs.promises.unlink(file.path).catch(() => {});
    }
};
const uploadedFile = (req, field) => req.files?.[field]?.[0] || (field === 'categoryImage' ? req.file : null);
const uploadedPublicPath = (req, field) => {
    const file = uploadedFile(req, field);
    return file ? `/public/${encodeURIComponent(file.filename)}` : '';
};
const removeCategoryUploads = async (req) => Promise.all([req.file, ...Object.values(req.files || {}).flat()].filter(Boolean).map(removeUploadedFile));

function createCategories(categories){
    const categoryList = categories.map(category => ({
        _id: category._id,
        name: category.name,
        slug: category.slug,
        type: category.type === 'page' && inferCategoryType(category.name) === 'product'
            ? 'product'
            : categoryTypes.has(category.type) ? category.type : '',
        parentId: category.parentId,
        categoryImage: category.categoryImage,
        coverImage: category.coverImage || '',
        iconKey: category.iconKey || '',
        showOnHome: category.showOnHome === undefined ? !category.parentId : category.showOnHome,
        displayOrder: category.displayOrder || 0,
        isActive: category.isActive !== false,
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

exports.addCategory = async (req, res) => {
    try {
        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
        if (!name) {
            await removeCategoryUploads(req);
            return res.status(400).json({ message: 'Category name is required' });
        }

        const type = typeof req.body?.type === 'string' ? req.body.type.trim().toLowerCase() : '';
        if (type && !categoryTypes.has(type)) {
            await removeCategoryUploads(req);
            return res.status(400).json({ message: 'Choose a valid category type: page, store, or product' });
        }

        const categoryObj = {
            name,
            slug: await uniqueCategorySlug(name)
        };
        const parentId = typeof req.body?.parentId === 'string' ? req.body.parentId.trim() : '';
        if (!parentId && uploadedFile(req, 'categoryImage')) {
            await removeCategoryUploads(req);
            return res.status(400).json({ message: 'Main categories use an icon. Category images can only be uploaded for subcategories.' });
        }
        if(parentId){
            if (!mongoose.Types.ObjectId.isValid(parentId)) {
                await removeCategoryUploads(req);
                return res.status(400).json({ message: 'Invalid parent category' });
            }
            const parentCategory = await Category.findById(parentId).select('_id type').exec();
            if (!parentCategory) {
                await removeCategoryUploads(req);
                return res.status(400).json({ message: 'Parent category was not found' });
            }
            categoryObj.parentId = parentCategory._id.toString();
            categoryObj.type = type || inferCategoryType(name, parentCategory.type);
        }

        if (!parentId) categoryObj.type = inferCategoryType(name, type);

        if(uploadedFile(req, 'categoryImage')) categoryObj.categoryImage = uploadedPublicPath(req, 'categoryImage');
        if(uploadedFile(req, 'coverImage')) categoryObj.coverImage = uploadedPublicPath(req, 'coverImage');
        categoryObj.iconKey = String(req.body.iconKey || '').trim().slice(0, 40);
        categoryObj.displayOrder = Math.max(0, Number(req.body.displayOrder) || 0);
        categoryObj.isActive = req.body.isActive !== 'false';
        if (req.body.showOnHome !== undefined) categoryObj.showOnHome = req.body.showOnHome === 'true';
        else if (!parentId) categoryObj.showOnHome = true;
        

        const category = await new Category(categoryObj).save();
        return res.status(201).json({ category });
    } catch (error) {
        await removeCategoryUploads(req);
        return res.status(400).json({ error });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            await removeCategoryUploads(req);
            return res.status(400).json({ message: 'Invalid category' });
        }

        const category = await Category.findById(categoryId).exec();
        if (!category) {
            await removeCategoryUploads(req);
            return res.status(404).json({ message: 'Category not found' });
        }

        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
        if (!name) {
            await removeCategoryUploads(req);
            return res.status(400).json({ message: 'Category name is required' });
        }

        const type = typeof req.body?.type === 'string' ? req.body.type.trim().toLowerCase() : '';
        if (type && !categoryTypes.has(type)) {
            await removeCategoryUploads(req);
            return res.status(400).json({ message: 'Choose a valid category type: page, store, or product' });
        }

        const parentId = typeof req.body?.parentId === 'string' ? req.body.parentId.trim() : '';
        if (parentId) {
            if (!mongoose.Types.ObjectId.isValid(parentId)) {
                await removeCategoryUploads(req);
                return res.status(400).json({ message: 'Invalid parent category' });
            }

            let parentCategory = await Category.findById(parentId).select('_id parentId').exec();
            if (!parentCategory) {
                await removeCategoryUploads(req);
                return res.status(400).json({ message: 'Parent category was not found' });
            }

            const visitedParents = new Set();
            while (parentCategory) {
                const parentCategoryId = parentCategory._id.toString();
                if (parentCategoryId === category._id.toString()) {
                    await removeCategoryUploads(req);
                    return res.status(400).json({ message: 'A category cannot be moved under itself or its child' });
                }
                if (visitedParents.has(parentCategoryId)) {
                    await removeCategoryUploads(req);
                    return res.status(400).json({ message: 'The selected category hierarchy is invalid' });
                }
                visitedParents.add(parentCategoryId);
                parentCategory = parentCategory.parentId
                    ? await Category.findById(parentCategory.parentId).select('_id parentId').exec()
                    : null;
            }

            category.parentId = parentId;
        } else {
            category.parentId = null;
        }

        const parentForType = parentId ? await Category.findById(parentId).select('type').exec() : null;

        if (!parentId && uploadedFile(req, 'categoryImage')) {
            await removeCategoryUploads(req);
            return res.status(400).json({ message: 'Main categories use an icon. Category images can only be uploaded for subcategories.' });
        }

        category.name = name;
        const nextSlug = await uniqueCategorySlug(name, category._id);
        if (category.slug && category.slug !== nextSlug) {
            category.previousSlugs = [...new Set([...(category.previousSlugs || []), category.slug])];
        }
        category.slug = nextSlug;
        category.type = type || inferCategoryType(name, parentForType?.type);
        category.iconKey = String(req.body.iconKey ?? category.iconKey ?? '').trim().slice(0, 40);
        category.displayOrder = Math.max(0, Number(req.body.displayOrder ?? category.displayOrder) || 0);
        category.isActive = req.body.isActive === undefined ? category.isActive !== false : req.body.isActive === 'true';
        if (req.body.showOnHome !== undefined) category.showOnHome = req.body.showOnHome === 'true';
        if (uploadedFile(req, 'categoryImage')) category.categoryImage = uploadedPublicPath(req, 'categoryImage');
        if (uploadedFile(req, 'coverImage')) category.coverImage = uploadedPublicPath(req, 'coverImage');
        if (req.body.removeCategoryImage === 'true') category.categoryImage = '';
        if (req.body.removeCoverImage === 'true') category.coverImage = '';

        await category.save();
        return res.status(200).json({ category });
    } catch (error) {
        await removeCategoryUploads(req);
        return res.status(400).json({ message: error.message });
    }
};

exports.deleteCategories = async (req, res) => {
    try {
        if (!Array.isArray(req.body?.categoryIds)) {
            return res.status(400).json({ message: 'Select categories to delete' });
        }

        const categoryIds = [...new Set(req.body.categoryIds.map(String))];
        if (!categoryIds.length || categoryIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
            return res.status(400).json({ message: 'Select valid categories to delete' });
        }

        const categories = await Category.find({ _id: { $in: categoryIds } }).select('_id').exec();
        if (categories.length !== categoryIds.length) {
            return res.status(404).json({ message: 'One or more categories were not found' });
        }

        const childCategory = await Category.findOne({
            parentId: { $in: categoryIds },
            _id: { $nin: categoryIds }
        }).select('_id').exec();
        if (childCategory) {
            return res.status(400).json({ message: 'Delete child categories before deleting their parent' });
        }

        const product = await Product.findOne({ category: { $in: categoryIds } }).select('_id').exec();
        if (product) {
            return res.status(400).json({ message: 'Move or delete products before deleting their category' });
        }

        const brand = await Brand.findOne({ categoryIds: { $in: categoryIds } }).select('name').exec();
        if (brand) {
            return res.status(400).json({ message: `Remove ${brand.name} from this category before deleting it` });
        }

        await Category.deleteMany({ _id: { $in: categoryIds } }).exec();
        return res.status(200).json({ message: 'Categories deleted successfully' });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find({}).sort({ displayOrder: 1, name: 1 }).lean().exec();
        const categoryList = createCategories(categories);
        return res.status(200).json({ categoryList });
    } catch (error) {
        return res.status(400).json({ error });
    }
};

