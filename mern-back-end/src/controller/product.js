const Product = require ('../models/product');
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const slugify = require('slugify');
const Category = require ('../models/category')
const Brand = require('../models/brand');
const { isPrintingCategory } = require('../utils/customDesign');
const productUploadsPath = path.resolve(__dirname, '..', 'uploads');

const removeUnreferencedProductImages = async (imageNames) => {
    for (const imageName of imageNames) {
        const safeName = path.basename(imageName);
        if (!safeName || safeName !== imageName) continue;
        const stillReferenced = await Product.exists({
            $or: [
                { 'productPictures.img': safeName },
                { 'colors.productPictures.img': safeName },
            ],
        }).exec();
        if (!stillReferenced) {
            await fs.promises.unlink(path.join(productUploadsPath, safeName)).catch((error) => {
                if (error.code !== 'ENOENT') console.error(`Could not remove unused product image ${safeName}:`, error);
            });
        }
    }
};

async function resolveBrandForCategory(brandId, categoryId) {
    if (!brandId) return { brandId: null, brand: '' };
    const mongoose = require('mongoose');
    if (!mongoose.isValidObjectId(brandId) || !mongoose.isValidObjectId(categoryId)) throw new Error('Choose a valid brand and product category.');
    const [brand, category] = await Promise.all([
        Brand.findOne({ _id: brandId, isActive: { $ne: false } }).lean().exec(),
        Category.findById(categoryId).select('_id parentId').lean().exec()
    ]);
    if (!brand || !category) throw new Error('The selected brand or product category no longer exists.');
    const assignedCategories = new Set((brand.categoryIds || []).map(String));
    let currentCategory = category;
    while (currentCategory) {
        if (assignedCategories.has(String(currentCategory._id))) return { brandId: brand._id, brand: brand.name };
        currentCategory = currentCategory.parentId ? await Category.findById(currentCategory.parentId).select('_id parentId').lean().exec() : null;
    }
    throw new Error('This brand is not assigned to the selected product category.');
}

async function categoryUsesCustomPrinting(categoryId) {
    let current = await Category.findById(categoryId).select("_id name slug parentId").lean().exec();
    const seen = new Set();
    while (current && !seen.has(String(current._id))) {
        if (isPrintingCategory(current)) return true;
        seen.add(String(current._id));
        current = current.parentId ? await Category.findById(current.parentId).select("_id name slug parentId").lean().exec() : null;
    }
    return false;
}

const readCustomPrintOptions = (value, enabled) => {
    if (!enabled) return [];
    const options = typeof value === "string" ? JSON.parse(value || "[]") : value || [];
    if (!Array.isArray(options)) throw new Error("Custom print prices must be a list.");
    const allowed = new Set(["front", "back", "front-and-back"]);
    const normalized = options.map((option) => ({
        placement: String(option.placement || ""),
        price: option.price === "" || option.price == null ? NaN : Number(option.price),
        isAvailable: option?.isAvailable !== false
    }));
    if (normalized.some((option) => !allowed.has(option.placement) || !Number.isFinite(option.price) || option.price < 0)) {
        throw new Error("Set a valid non-negative price for each custom printing side.");
    }
    if (new Set(normalized.map((option) => option.placement)).size !== normalized.length) throw new Error("Each custom printing side can only be configured once.");
    return normalized;
};

const getUploadedFiles = (req) => Array.isArray(req.files) ? req.files : [];

async function attachProductCategoryPath(product) {
    if (!product?.category?._id) return product;
    const path = [];
    const visited = new Set();
    let current = product.category;
    while (current && !visited.has(String(current._id))) {
        visited.add(String(current._id));
        path.unshift({ _id: current._id, name: current.name, slug: current.slug });
        current = current.parentId ? await Category.findById(current.parentId).select("_id name slug parentId").lean().exec() : null;
    }
    product.categoryPath = path;
    product.requiresCustomerDesign = product.requiresCustomerDesign === true;
    product.allowDesignInstructions = typeof product.allowDesignInstructions === "boolean"
        ? product.allowDesignInstructions
        : false;
    return product;
}

const putFeaturedPictureFirst = (pictures, featuredImageIndex = 0) => {
    const index = Math.min(Math.max(0, Number(featuredImageIndex) || 0), Math.max(0, pictures.length - 1));
    if (index === 0 || !pictures[index]) return pictures;
    return [pictures[index], ...pictures.filter((picture, pictureIndex) => pictureIndex !== index)];
};

const readSpecifications = (value) => {
    let specifications = value;
    if (typeof value === 'string') specifications = JSON.parse(value || '[]');
    if (!Array.isArray(specifications)) throw new Error('Product specifications must be a list.');
    return specifications.slice(0, 80).map((item) => ({
        name: String(item.name || '').trim().slice(0, 100),
        value: String(item.value || '').trim().slice(0, 500)
    })).filter((item) => item.name && item.value);
};

const readCustomProductOptions = (value) => {
    let groups = value;
    if (typeof groups === 'string') groups = JSON.parse(groups || '[]');
    if (!Array.isArray(groups)) throw new Error('Custom product options must be a list.');
    const normalized = groups.slice(0, 30).map((group) => ({
        name: String(group.name || '').trim().slice(0, 100),
        options: (Array.isArray(group.options) ? group.options : []).slice(0, 50).map((option) => ({
            value: String(option.value || '').trim().slice(0, 100),
            price: option.price === '' || option.price == null ? NaN : Number(option.price)
        })).filter((option) => option.value)
    })).filter((group) => group.name && group.options.length);
    const names = normalized.map((group) => group.name.toLowerCase());
    if (new Set(names).size !== names.length) throw new Error('Custom product option names must be unique.');
    if (normalized.some((group) => group.options.some((option) => !Number.isFinite(option.price) || option.price < 0))) throw new Error('Each custom product option needs a valid non-negative extra price.');
    if (normalized.some((group) => new Set(group.options.map((option) => option.value.toLowerCase())).size !== group.options.length)) throw new Error('Choices within each custom product option must be unique.');
    return normalized;
};

const readSizes = (value) => {
    let sizes = value;
    if (typeof value === 'string') sizes = JSON.parse(value || '[]');
    if (!Array.isArray(sizes)) throw new Error('Product sizes must be a list.');
    const normalized = sizes.slice(0, 30).map((item) => ({
        size: String(item.size || '').trim().slice(0, 40),
        quantity: item.quantity === '' || item.quantity == null ? NaN : Number(item.quantity)
    })).filter((item) => item.size);
    const names = normalized.map((item) => item.size.toLowerCase());
    if (new Set(names).size !== names.length) throw new Error('Product sizes must be unique.');
    if (normalized.some((item) => !Number.isInteger(item.quantity) || item.quantity < 0)) throw new Error('Size stock must use non-negative whole numbers.');
    return normalized;
};

const readColors = (req, existingColors = []) => {
    let colors = existingColors;
    if (typeof req.body?.colors === 'string') {
        colors = JSON.parse(req.body.colors || '[]');
    }
    if (!Array.isArray(colors)) {
        throw new Error('Product colors must be a list.');
    }

    const files = getUploadedFiles(req);
    return colors.map((color, colorIndex) => {
        let productPictures = Array.isArray(color.productPictures)
            ? color.productPictures.map((picture) => ({ img: picture.img }))
            : [];
        const uploadedColorPictures = files.filter((file) => file.fieldname === `colorPicture_${colorIndex}`);

        files.forEach((file) => {
            const replaceMatch = file.fieldname.match(new RegExp(`^replaceColorPicture_${colorIndex}_(\\d+)$`));
            if (replaceMatch) {
                const pictureIndex = Number(replaceMatch[1]);
                if (productPictures[pictureIndex]) productPictures[pictureIndex] = { img: file.filename };
            } else if (file.fieldname === `colorPicture_${colorIndex}`) {
                productPictures.push({ img: file.filename });
            }
        });

        if (Array.isArray(color.imageOrder)) {
            const orderedPictures = color.imageOrder.map((item) => {
                if (item?.type === 'existing') return productPictures.find((picture) => picture.img === item.img);
                if (item?.type === 'new' && Number.isInteger(item.index)) return uploadedColorPictures[item.index] ? { img: uploadedColorPictures[item.index].filename } : undefined;
                return undefined;
            }).filter(Boolean);
            productPictures = orderedPictures;
        }
        const featuredImageIndex = Math.min(Math.max(0, Number(color.featuredImageIndex) || 0), Math.max(0, productPictures.length - 1));
        return {
            colorName: typeof color.colorName === 'string' ? color.colorName.trim() : '',
            colorCode: typeof color.colorCode === 'string' ? color.colorCode.trim() : '',
            price: color.price === '' || color.price === undefined ? undefined : Number(color.price),
            productPictures: putFeaturedPictureFirst(productPictures, featuredImageIndex),
            featuredImageIndex: 0,
            quantity: color.quantity === '' || color.quantity === undefined ? undefined : Number(color.quantity),
            sizes: Array.isArray(color.sizes) ? color.sizes.map((size) => ({
                size: typeof size.size === 'string' ? size.size.trim() : '',
                quantity: size.quantity === '' || size.quantity == null ? NaN : Number(size.quantity)
            })) : [],
            useProductPictures: color.useProductPictures === true
        };
    });
};

const calculateBaseQuantity = (sizes, colors, quantity) => {
    const hasCompleteVariantInventory = colors.length > 0 && colors.every((color) =>
        color.sizes?.length || (color.quantity !== undefined && Number.isInteger(color.quantity) && color.quantity >= 0)
    );
    if (hasCompleteVariantInventory) {
        return colors.reduce((total, color) => total + (color.sizes?.length
            ? color.sizes.reduce((sizeTotal, size) => sizeTotal + size.quantity, 0)
            : color.quantity), 0);
    }
    if (sizes.length) return sizes.reduce((total, size) => total + size.quantity, 0);
    if (quantity === "" || quantity == null) return NaN;
    return Number(quantity);
};

exports.createProduct = async (req, res) => {
    try {
    //res.status(200).json( { file: req.files, body: req.body } );
    const {
        name, price, description, category, quantity, createdBy
    } = req.body;
    const files = getUploadedFiles(req);
    const productPictures = files
        .filter((file) => file.fieldname === 'productPicture')
        .map((file) => ({ img: file.filename }));
    const printingProduct = await categoryUsesCustomPrinting(category);
    const defaultColorName = String(req.body.defaultColorName || '').trim().slice(0, 60);
    const requiresCustomerDesign = printingProduct && req.body.requiresCustomerDesign === 'true';
    const allowDesignInstructions = requiresCustomerDesign && req.body.allowDesignInstructions === 'true';
    const submittedColors = readColors(req);
    if (printingProduct && submittedColors.some((color) => color.useProductPictures && !color.colorName) && !defaultColorName) return res.status(400).json({ error: 'Enter the default color name for the main product images.' });
    const colors = submittedColors.map((color) => {
        const linkedImages = color.useProductPictures ? putFeaturedPictureFirst(productPictures, req.body.featuredImageIndex).map((picture) => ({ img: picture.img })) : color.productPictures;
        return { ...color, colorName: color.colorName || (color.useProductPictures ? defaultColorName : ''), productPictures: linkedImages, useProductPictures: undefined };
    });
    const sizes = readSizes(req.body.sizes || '[]');
    const baseQuantity = calculateBaseQuantity(sizes, colors, quantity);
    if (!Number.isInteger(baseQuantity) || baseQuantity < 0) return res.status(400).json({ error: 'Enter a non-negative product quantity, or set inventory for every color or color-size option.' });
    const selectedBrand = await resolveBrandForCategory(req.body.brandId, category);
    const offer = Number(req.body.offer || 0);
    if (!Number.isFinite(offer) || offer < 0 || offer > 99) return res.status(400).json({ message: 'Discount percentage must be between 0 and 99.' });
    if (colors.some((color) => !color.colorName)) {
        return res.status(400).json({ error: 'Enter a color name for every variant (for example, Black or White). Use Default color name for the main product images.' });
    }
    if (colors.some((color) => !/^#[0-9a-fA-F]{6}$/.test(color.colorCode))) {
        return res.status(400).json({ error: 'Choose a valid six-digit color code for every variant.' });
    }
    if (colors.some((color) => (color.quantity !== undefined && (!Number.isInteger(color.quantity) || color.quantity < 0)) || color.sizes.some((size) => !size.size || !Number.isInteger(size.quantity) || size.quantity < 0))) {
        return res.status(400).json({ error: 'Variant stock must use non-negative whole numbers and each size needs a size name.' });
    }
    if (colors.some((color) => new Set(color.sizes.map((size) => size.size.toLowerCase())).size !== color.sizes.length)) return res.status(400).json({ error: 'Size names must be unique within each color.' });
    const customPrintOptions = readCustomPrintOptions(req.body.customPrintOptions, printingProduct);
    const customProductOptions = readCustomProductOptions(req.body.customProductOptions || '[]');

    const productBaseSlug = slugify(name, { lower: true, strict: true }) || shortid.generate();
    let productSlug = productBaseSlug;
    while (await Product.exists({ slug: productSlug })) productSlug = `${productBaseSlug}-${shortid.generate()}`;
    const product = new Product({
        name: name,
        slug: productSlug,
        price,
        quantity: baseQuantity,
        description,
        offer,
        discountEnabled: req.body.discountEnabled === 'true',
        dealEnabled: req.body.dealEnabled === 'true',
        dealLabel: String(req.body.dealLabel || '').trim().slice(0, 100),
        reviewsEnabled: req.body.reviewsEnabled !== 'false',
        warranty: String(req.body.warranty || '').trim().slice(0, 2000),
        customDesignGuidelines: String(req.body.customDesignGuidelines || '').trim().slice(0, 2000),
        requiresCustomerDesign,
        allowDesignInstructions,
        specifications: readSpecifications(req.body.specifications || '[]'),
        productPictures: putFeaturedPictureFirst(productPictures, req.body.featuredImageIndex),
        featuredImageIndex: 0,
        sizes,
        colors,
        defaultColorName,
        customPrintOptions,
        customProductOptions,
        category,
        ...selectedBrand,
        createdBy: req.auth.userId
    });

    const savedProduct = await product.save();
    return res.status(201).json({ product: savedProduct });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
    
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId).exec();
        if (!product) return res.status(404).json({ message: 'Product not found.' });

        const files = getUploadedFiles(req);
        const currentProductPictures = (product.productPictures || []).map((picture) => ({ img: picture.img }));
        const uploadedProductPictures = files.filter((file) => file.fieldname === 'productPicture').map((file) => ({ img: file.filename }));
        let productPictures = currentProductPictures;
        const hasOrderedProductPictures = req.body.productPictures !== undefined;
        if (req.body.productPictures !== undefined) {
            const requestedOrder = JSON.parse(req.body.productPictures);
            if (!Array.isArray(requestedOrder)) return res.status(400).json({ error: 'Product images must be a list.' });
            productPictures = requestedOrder.map((item) => {
                if (typeof item === 'string') return currentProductPictures.find((picture) => picture.img === item);
                if (item?.type === 'existing' && typeof item.img === 'string') return currentProductPictures.find((picture) => picture.img === item.img);
                if (item?.type === 'new' && Number.isInteger(item.index)) return uploadedProductPictures[item.index];
                return undefined;
            }).filter(Boolean);
        }
        files.forEach((file) => {
            const replaceMatch = file.fieldname.match(/^replaceProductPicture_(\d+)$/);
            if (replaceMatch) {
                const pictureIndex = Number(replaceMatch[1]);
                if (productPictures[pictureIndex]) productPictures[pictureIndex] = { img: file.filename };
            } else if (file.fieldname === 'productPicture' && !hasOrderedProductPictures) {
                productPictures.push({ img: file.filename });
            }
        });

        const categoryId = req.body.category || product.category;
        const printingProduct = await categoryUsesCustomPrinting(categoryId);
        const defaultColorName = String(req.body.defaultColorName ?? product.defaultColorName ?? '').trim().slice(0, 60);
        const requiresCustomerDesign = printingProduct && (req.body.requiresCustomerDesign === undefined
            ? product.requiresCustomerDesign === true
            : req.body.requiresCustomerDesign === 'true');
        const allowDesignInstructions = requiresCustomerDesign && (req.body.allowDesignInstructions === undefined
            ? product.allowDesignInstructions === true
            : req.body.allowDesignInstructions === 'true');
        const retainedMainImageNames = new Set(productPictures.map((picture) => picture.img));
        const removedMainImageNames = new Set(currentProductPictures.filter((picture) => !retainedMainImageNames.has(picture.img)).map((picture) => picture.img));
        const submittedColors = readColors(req, product.colors || []);
        if (printingProduct && submittedColors.some((color) => color.useProductPictures && !color.colorName) && !defaultColorName) return res.status(400).json({ error: 'Enter the default color name for the main product images.' });
        const colors = submittedColors.map((color) => {
            const linkedImages = color.useProductPictures ? putFeaturedPictureFirst(productPictures, req.body.featuredImageIndex).map((picture) => ({ img: picture.img })) : color.productPictures;
            const retainedColorImages = linkedImages.filter((picture) => !removedMainImageNames.has(picture.img));
            return { ...color, colorName: color.colorName || (color.useProductPictures ? defaultColorName : ''), productPictures: retainedColorImages, useProductPictures: undefined };
        });
        const sizes = readSizes(req.body.sizes || '[]');
        const baseQuantity = calculateBaseQuantity(sizes, colors, req.body.quantity);
        if (!Number.isInteger(baseQuantity) || baseQuantity < 0) return res.status(400).json({ error: 'Enter a non-negative product quantity, or set inventory for every color or color-size option.' });
        const selectedBrand = req.body.brandId
            ? await resolveBrandForCategory(req.body.brandId, req.body.category || product.category)
            : req.body.brandId === ''
                ? { brandId: null, brand: '' }
                : { brandId: product.brandId || null, brand: product.brand || '' };
        const offer = Number(req.body.offer || 0);
        if (!Number.isFinite(offer) || offer < 0 || offer > 99) return res.status(400).json({ message: 'Discount percentage must be between 0 and 99.' });
        if (colors.some((color) => !color.colorName)) {
            return res.status(400).json({ error: 'Enter a color name for every variant (for example, Black or White). Use Default color name for the main product images.' });
        }
        if (colors.some((color) => !/^#[0-9a-fA-F]{6}$/.test(color.colorCode))) {
            return res.status(400).json({ error: 'Choose a valid six-digit color code for every variant.' });
        }
        if (colors.some((color) => (color.quantity !== undefined && (!Number.isInteger(color.quantity) || color.quantity < 0)) || color.sizes.some((size) => !size.size || !Number.isInteger(size.quantity) || size.quantity < 0))) {
            return res.status(400).json({ error: 'Variant stock must use non-negative whole numbers and each size needs a size name.' });
        }
        if (colors.some((color) => new Set(color.sizes.map((size) => size.size.toLowerCase())).size !== color.sizes.length)) return res.status(400).json({ error: 'Size names must be unique within each color.' });
        const customPrintOptions = readCustomPrintOptions(req.body.customPrintOptions ?? product.customPrintOptions, printingProduct);
        const customProductOptions = readCustomProductOptions(req.body.customProductOptions ?? product.customProductOptions ?? []);

        const changes = {
            name: req.body.name,
            quantity: baseQuantity,
            price: req.body.price,
            description: req.body.description,
            offer,
            discountEnabled: req.body.discountEnabled === 'true',
            dealEnabled: req.body.dealEnabled === 'true',
            dealLabel: String(req.body.dealLabel || '').trim().slice(0, 100),
            reviewsEnabled: req.body.reviewsEnabled !== 'false',
            warranty: String(req.body.warranty || '').trim().slice(0, 2000),
            customDesignGuidelines: String(req.body.customDesignGuidelines ?? product.customDesignGuidelines ?? '').trim().slice(0, 2000),
            requiresCustomerDesign,
            allowDesignInstructions,
            specifications: readSpecifications(req.body.specifications || '[]'),
            category: req.body.category,
            ...selectedBrand,
            productPictures: putFeaturedPictureFirst(productPictures, req.body.featuredImageIndex),
            featuredImageIndex: 0,
            sizes,
            colors,
            defaultColorName,
            customPrintOptions,
            customProductOptions
        };

        product.set(changes);
        // Explicitly mark the nested option array so every choice and price is
        // persisted when the product document is saved.
        product.markModified('customProductOptions');
        const updatedProduct = await product.save();
        await updatedProduct.populate('category', '_id name');

        await removeUnreferencedProductImages(removedMainImageNames);

        return res.status(200).json({ product: updatedProduct });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.productId).exec();
        if (!product) return res.status(404).json({ message: 'Product not found.' });
        return res.status(200).json({ message: 'Product deleted successfully.', productId: product._id });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

exports.getProductsBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const category = await Category.findOne({ $or: [{ slug }, { previousSlugs: slug }] }).sort({ slug: 1 }).select('_id name slug type parentId').exec();

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const products = await Product.find({ category: category._id, isActive: { $ne: false } }).populate('category', '_id name slug').lean().exec();
        const childCategories = await Category.find({ parentId: String(category._id) })
            .select('_id name slug categoryImage type parentId')
            .sort({ name: 1 })
            .lean()
            .exec();
        const categoryPath = [];
        let pathNode = category;
        while (pathNode) {
            categoryPath.unshift({ _id: pathNode._id, name: pathNode.name, slug: pathNode.slug });
            pathNode = pathNode.parentId ? await Category.findById(pathNode.parentId).select('_id name slug parentId').lean().exec() : null;
        }
        const parentCategory = category.parentId
            ? await Category.findById(category.parentId).select('name').exec()
            : null;
        const categoryName = parentCategory
            ? `${category.name} ${parentCategory.name}`
            : category.name;
        const prices = products
            .map((product) => Number(product.price))
            .filter(Number.isFinite);
        const productsByPrice = {};
        const priceRange = {};

        if (prices.length) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const range = maxPrice - minPrice;

            const roughStep = range === 0 ? maxPrice / 5 : range / Math.min(5, prices.length);
            const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(5000, roughStep))));
            const normalizedStep = Math.max(5000, roughStep) / magnitude;
            const step = (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) * magnitude;
            const firstRange = Math.floor(minPrice / step) * step;

            for (let lower = firstRange; lower <= maxPrice; lower += step) {
                const upper = lower + step;
                const rangeProducts = products.filter((product) => {
                    const price = Number(product.price);
                    return price >= lower && (upper > maxPrice ? price <= upper : price < upper);
                });

                if (rangeProducts.length) {
                    const label = `${lower} - ${upper}`;
                    productsByPrice[label] = rangeProducts;
                    priceRange[label] = upper;
                }
            }
        }

        return res.status(200).json({
            products,
            categoryName,
            category: { _id: category._id, name: category.name, slug: category.slug, type: category.type },
            categoryPath,
            childCategories,
            priceRange,
            productsByPrice,
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.getProductBySlug = async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug, isActive: { $ne: false } })
            .populate('category', '_id name slug parentId')
            .populate('brandId', '_id name slug logo')
            .lean()
            .exec();
        if (!product) return res.status(404).json({ message: 'Product not found' });
        await attachProductCategoryPath(product);
        return res.status(200).json({ product });
    } catch (error) {
        return res.status(500).json({ message: 'Could not load product' });
    }
};
exports.getProductById = async (req, res) => {
    try {
        if (!require('mongoose').isValidObjectId(req.params.productId)) return res.status(400).json({ message: 'Invalid product ID' });
        const product = await Product.findOne({ _id: req.params.productId, isActive: { $ne: false } }).populate('category', '_id name slug parentId').populate('brandId', '_id name slug logo').lean().exec();
        if (!product) return res.status(404).json({ message: 'Product not found' });
        await attachProductCategoryPath(product);
        return res.status(200).json({ product });
    } catch (error) { return res.status(500).json({ message: 'Could not load product' }); }
};

exports.getAdminProducts = async (_req, res) => {
    try {
        const products = await Product.find({}).populate('category', '_id name slug parentId').sort({ createdAt: -1 }).lean().exec();
        return res.status(200).json({ products });
    } catch (error) { return res.status(500).json({ message: 'Could not load products' }); }
};

exports.getStorefrontProducts = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(60, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
        const [products, total] = await Promise.all([
            Product.find({ isActive: { $ne: false } })
                .select("_id name slug price quantity offer discountEnabled dealEnabled dealLabel productPictures featuredImageIndex sizes colors category brand")
                .populate("category", "_id name slug")
                .populate("brandId", "_id name slug logo")
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .exec(),
            Product.countDocuments({ isActive: { $ne: false } }).exec(),
        ]);
        return res.status(200).json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error("Storefront product listing failed:", error.message);
        return res.status(500).json({ message: "Could not load products" });
    }
};

exports.getRandomStorefrontProducts = async (req, res) => {
    try {
        const mongoose = require("mongoose");
        const limit = Math.min(24, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
        const excludedIds = String(req.query.exclude || "").split(",").filter(mongoose.isValidObjectId).slice(0, 300);
        const match = { isActive: { $ne: false } };
        if (excludedIds.length) match._id = { $nin: excludedIds.map((id) => new mongoose.Types.ObjectId(id)) };
        const products = await Product.aggregate([
            { $match: match },
            { $sample: { size: limit } },
            { $project: { _id: 1, name: 1, slug: 1, price: 1, quantity: 1, offer: 1, discountEnabled: 1, dealEnabled: 1, dealLabel: 1, productPictures: 1, featuredImageIndex: 1, sizes: 1, colors: 1, category: 1, brand: 1, brandId: 1 } },
        ]).exec();
        const [populated, total] = await Promise.all([
            Product.populate(products, [
                { path: "category", select: "_id name slug" },
                { path: "brandId", select: "_id name slug logo" },
            ]),
            Product.countDocuments({ isActive: { $ne: false } }).exec(),
        ]);
        return res.status(200).json({ products: populated, hasMore: total > excludedIds.length + populated.length });
    } catch (error) {
        console.error("Random storefront product discovery failed:", error.message);
        return res.status(500).json({ message: "Could not discover more products" });
    }
};

