import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../../components/Layout";
import { addProduct, deleteProductById, updateProduct } from "../../actions/product.action";
import { getAllCategory } from "../../actions/category.action";
import axios from "../../helpers/axios";
import { generatePublicUrl } from "../../urlConfig";
import { PRODUCT_CSV_COLUMNS, parseCsv, parseJsonCell, stringifyCsv } from "./productCsv";
import "./style.css";

const blankSize = () => ({ size: "", quantity: "" });
const blankCustomProductOption = () => ({ name: "", options: [{ value: "", price: "" }] });
const blankColor = () => ({ colorName: "", colorCode: "#000000", price: "", quantity: "", sizes: [], productPictures: [], useProductPictures: false, files: [] });
const blankForm = () => ({ name: "", category: "", brandId: "", price: "", quantity: "", description: "", offer: "", discountEnabled: false, dealEnabled: false, dealLabel: "", reviewsEnabled: true, warranty: "", specifications: [], customProductOptions: [], sizes: [], colors: [], defaultColorName: "", featuredImageIndex: 0, customPrintOptions: [], customDesignGuidelines: "", requiresCustomerDesign: false, allowDesignInstructions: false });
const flattenCategories = (nodes, parents = []) => (nodes || []).flatMap((node) => {
  const path = [...parents, node.name];
  return [
    ...(node.type === "page" || node.type === "store" ? [] : [{ value: String(node._id), label: path.join(" › "), name: node.name, slug: node.slug, path }]),
    ...flattenCategories(node.children, path),
  ];
});
const printingCategory = (category) => /printing|custom.print/i.test(`${category?.name || ""} ${category?.slug || ""} ${(category?.path || []).join(" ")}`);
const fileUrl = (file) => file instanceof File ? URL.createObjectURL(file) : generatePublicUrl(file?.img || file || "");
const placements = [ ["front", "Front print"], ["back", "Back print"], ["front-and-back", "Front and back"] ];

export default function ProductManager() {
  const dispatch = useDispatch();
  const categoryState = useSelector((state) => state.category || {});
  const productState = useSelector((state) => state.product || {});
  const categories = useMemo(() => flattenCategories(categoryState.categories), [categoryState.categories]);
  const [rows, setRows] = useState(productState.products || []);
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [mainFiles, setMainFiles] = useState([]);
  const [mainExisting, setMainExisting] = useState([]);
  const [mainOrder, setMainOrder] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [previewColor, setPreviewColor] = useState(0);
  const [previewPrint, setPreviewPrint] = useState("");
  const [previewCustomOptions, setPreviewCustomOptions] = useState({});
  const [descriptionLink, setDescriptionLink] = useState("");
  const [csvShow, setCsvShow] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvFiles, setCsvFiles] = useState([]);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvStatus, setCsvStatus] = useState("");
  const [csvError, setCsvError] = useState("");
  const csvInputRef = useRef(null);
  const descriptionRef = useRef(null);

  const reload = async () => {
    try { const response = await axios.post("/product/getProducts"); setRows(response.data?.products || []); }
    catch (e) { setError(e.response?.data?.message || "Could not load products. Check your admin connection and try again."); }
  };
  useEffect(() => {
    if (!categoryState.loaded && !categoryState.loading) dispatch(getAllCategory());
    axios.get("/admin/brands").then((response) => setBrands(response.data?.brands || [])).catch(() => setBrands([]));
    reload();
    // Load once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selectedCategory = categories.find((item) => item.value === form.category);
  const isPrinting = printingCategory(selectedCategory);
  const visibleRows = rows.filter((item) => `${item.name} ${item.brand} ${item.category?.name || ""}`.toLowerCase().includes(search.toLowerCase()));
  const downloadCsv = (filename, content) => {
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  };
  const exportProducts = () => {
    const exported = rows.map((product) => {
      const category = categories.find((item) => item.value === String(product.category?._id || product.category));
      const mainImages = (product.productPictures || []).map((picture) => picture.img);
      const colors = (product.colors || []).map((color) => ({ colorName: color.colorName, colorCode: color.colorCode, price: color.price, quantity: color.quantity, sizes: color.sizes || [], use_product_images: Boolean(color.useProductPictures), image_files: color.useProductPictures ? [] : (color.productPictures || []).map((picture) => picture.img) }));
      return [product.name, category?.label || product.category?.name || "", product.brand || "", product.price, product.quantity, product.description, mainImages.join("|"), product.defaultColorName || "", JSON.stringify(product.sizes || []), JSON.stringify(colors), JSON.stringify(product.specifications || []), JSON.stringify(product.customPrintOptions || []), JSON.stringify(product.customProductOptions || []), product.customDesignGuidelines || "", product.requiresCustomerDesign, product.allowDesignInstructions, product.discountEnabled, product.offer, product.dealEnabled, product.dealLabel || "", product.reviewsEnabled, product.warranty || ""];
    });
    downloadCsv("subazen-products.csv", stringifyCsv(PRODUCT_CSV_COLUMNS, exported));
  };
  const importProducts = async () => {
    setCsvError(""); setCsvStatus("");
    let products;
    try { products = parseCsv(csvText); }
    catch (e) { setCsvError(e.message); return; }
    if (products.length > 100) { setCsvError("Import up to 100 products at a time. Split larger CSV files into smaller batches."); return; }
    const filesByName = new Map(csvFiles.map((file) => [file.name.toLowerCase(), file]));
    const bool = (value, fallback = false) => value === "" ? fallback : /^(true|1|yes)$/i.test(value.trim());
    const number = (value, fallback = 0) => value === "" ? fallback : Number(value);
    const failures = [];
    let created = 0;
    setCsvBusy(true);
    try {
      for (let index = 0; index < products.length; index += 1) {
        const row = products[index];
        try {
          const categoryName = row.category_path.trim().toLowerCase();
          const matches = categories.filter((item) => item.label.toLowerCase() === categoryName || item.slug?.toLowerCase() === categoryName);
          if (matches.length !== 1) throw new Error(`Row ${row.__row}: category_path must exactly match one category path shown in the category list.`);
          const brand = row.brand.trim() ? brands.find((item) => item.isActive !== false && item.name.trim().toLowerCase() === row.brand.trim().toLowerCase()) : null;
          if (row.brand.trim() && !brand) throw new Error(`Row ${row.__row}: brand “${row.brand}” was not found or is inactive.`);
          const mainNames = row.image_files.split("|").map((name) => name.trim()).filter(Boolean);
          const mainUploads = mainNames.map((name) => filesByName.get(name.toLowerCase()));
          if (mainUploads.some((file) => !file)) throw new Error(`Row ${row.__row}: choose every file listed in image_files.`);
          if (!mainUploads.length) throw new Error(`Row ${row.__row}: add at least one WebP image filename in image_files.`);
          const sizes = parseJsonCell(row, "sizes_json");
          const colors = parseJsonCell(row, "colors_json").map((color, colorIndex) => {
            const colorFiles = (color.image_files || []).map((name) => filesByName.get(String(name).toLowerCase()));
            if (colorFiles.some((file) => !file)) throw new Error(`Row ${row.__row}: choose every color image file listed in colors_json.`);
            return { colorName: String(color.colorName || ""), colorCode: String(color.colorCode || "#000000"), price: color.price === "" || color.price == null ? undefined : Number(color.price), quantity: color.quantity === "" || color.quantity == null ? undefined : Number(color.quantity), sizes: color.sizes || [], useProductPictures: color.use_product_images === true, productPictures: [], imageOrder: colorFiles.map((_, imageIndex) => ({ type: "new", index: imageIndex })), __files: colorFiles, __index: colorIndex };
          });
          const allImages = [...mainUploads, ...colors.flatMap((color) => color.__files)];
          if (allImages.length > 30) throw new Error(`Row ${row.__row}: at most 30 images can be uploaded per product.`);
          if (allImages.some((file) => file.type !== "image/webp" || file.size > 400 * 1024)) throw new Error(`Row ${row.__row}: images must be WebP files no larger than 400 KB each.`);
          const data = new FormData();
          const values = { name: row.name.trim(), category: matches[0].value, brandId: brand?._id || "", price: number(row.price, NaN), quantity: number(row.quantity, NaN), description: row.description, defaultColorName: row.default_color_name || "", customDesignGuidelines: row.custom_design_guidelines || "", warranty: row.warranty || "", offer: number(row.offer), dealLabel: row.deal_label || "", featuredImageIndex: "0" };
          if (!values.name || !values.description.trim() || !Number.isFinite(values.price) || values.price < 0 || (!colors.length && (!Number.isInteger(values.quantity) || values.quantity < 0))) throw new Error(`Row ${row.__row}: name, description, price, and valid inventory are required.`);
          Object.entries(values).forEach(([key, value]) => data.append(key, String(value)));
          [["discountEnabled", bool(row.discount_enabled)], ["dealEnabled", bool(row.deal_enabled)], ["reviewsEnabled", bool(row.reviews_enabled, true)], ["requiresCustomerDesign", bool(row.requires_customer_design)], ["allowDesignInstructions", bool(row.allow_design_instructions)]].forEach(([key, value]) => data.append(key, String(value)));
          data.append("sizes", JSON.stringify(sizes));
          data.append("specifications", JSON.stringify(parseJsonCell(row, "specifications_json")));
          data.append("customPrintOptions", JSON.stringify(parseJsonCell(row, "custom_print_options_json")));
          data.append("customProductOptions", JSON.stringify(parseJsonCell(row, "custom_product_options_json")));
          const cleanColors = colors.map(({ __files, __index, ...color }) => { __files.forEach((file) => data.append(`colorPicture_${__index}`, file)); return color; });
          data.append("colors", JSON.stringify(cleanColors));
          mainUploads.forEach((file) => data.append("productPicture", file));
          const result = await dispatch(addProduct(data));
          if (!result || result.error) throw new Error(`Row ${row.__row}: ${result?.error || "API rejected this product."}`);
          created += 1;
          setCsvStatus(`Importing ${index + 1} of ${products.length} · ${created} added · ${failures.length} failed`);
        } catch (e) { failures.push(e.message || `Row ${row.__row}: import failed.`); }
      }
      await reload();
      setCsvStatus(`${created} product${created === 1 ? "" : "s"} added${failures.length ? `; ${failures.length} failed` : " successfully"}.`);
      if (failures.length) setCsvError(failures.slice(0, 20).join("\n"));
    } finally { setCsvBusy(false); }
  };
  const setField = (key, value) => { setError(""); setFieldErrors((current) => ({ ...current, [key]: false })); setForm((current) => ({ ...current, [key]: value })); };
  const openCreate = () => { setEditing(null); setForm(blankForm()); setMainFiles([]); setMainExisting([]); setMainOrder([]); setPreviewPrint(""); setPreviewCustomOptions({}); setFieldErrors({}); setError(""); setNotice(""); setShow(true); };
  const openEdit = (product) => {
    setEditing(product);
    const mainImageNames = new Set((product.productPictures || []).map((pic) => pic.img));
    const existingColors = (product.colors || []).map((x, index) => ({ ...x, price: x.price ?? "", quantity: x.quantity ?? "", sizes: (x.sizes || []).map((s) => ({ size: s.size, quantity: s.quantity })), productPictures: x.productPictures || [], imageOrder: (x.productPictures || []).map((pic) => ({ type: "existing", pic })), useProductPictures: index === 0 && Boolean(product.productPictures?.length) && (!(x.productPictures || []).length || (x.productPictures || []).every((pic) => mainImageNames.has(pic.img))), files: [] }));
    const generalSizes = (product.sizes || []).map((x) => ({ size: x.size, quantity: x.quantity }));
    if (existingColors.length && !existingColors.some((color) => color.sizes.length) && generalSizes.length) existingColors[0].sizes = generalSizes.map((size) => ({ ...size }));
    const legacyCustomOptions = (product.specifications || []).map((item) => ({ name: item.name || "", options: [{ value: item.value || "", price: "0" }] }));
    setForm({ ...blankForm(), ...product, category: String(product.category?._id || product.category || ""), brandId: String(product.brandId?._id || product.brandId || ""), sizes: existingColors.length ? [] : generalSizes, colors: existingColors, specifications: product.specifications || [], customProductOptions: product.customProductOptions?.length ? product.customProductOptions : legacyCustomOptions, customPrintOptions: product.customPrintOptions || [], requiresCustomerDesign: product.requiresCustomerDesign === true, allowDesignInstructions: product.allowDesignInstructions === true });
    setMainFiles([]); setMainExisting(product.productPictures || []); setMainOrder((product.productPictures || []).map((pic) => ({ type: "existing", pic }))); setPreviewPrint(""); setPreviewCustomOptions({}); setFieldErrors({}); setError(""); setNotice(""); setShow(true);
  };
  const close = () => { if (!busy) setShow(false); };
  const updateSize = (group, index, key, value, colorIndex = -1) => { setError(""); setFieldErrors((current) => ({ ...current, sizes: false })); setForm((current) => {
    const next = { ...current };
    if (colorIndex >= 0) next.colors = current.colors.map((color, i) => i === colorIndex ? { ...color, sizes: color.sizes.map((size, j) => j === index ? { ...size, [key]: value } : size) } : color);
    else {
      next[group] = current[group].map((size, i) => i === index ? { ...size, [key]: value } : size);
      if (current.colors.length) next.colors = current.colors.map((color) => ({ ...color, sizes: (color.sizes || []).map((size, i) => i === index ? { ...size, [key]: value } : size) }));
    }
    return next;
  }); };
  const addSize = (colorIndex = -1) => setForm((current) => {
    if (colorIndex >= 0) return { ...current, colors: current.colors.map((color, i) => i === colorIndex ? { ...color, sizes: [...color.sizes, blankSize()] } : color) };
    const row = blankSize();
    return { ...current, sizes: [...current.sizes, row], colors: current.colors.map((color) => ({ ...color, sizes: [...(color.sizes || []), { ...row }] })) };
  });
  const removeSize = (colorIndex, index) => setForm((current) => colorIndex >= 0
    ? ({ ...current, colors: current.colors.map((color, i) => i === colorIndex ? { ...color, sizes: color.sizes.filter((_, j) => j !== index) } : color) })
    : ({ ...current, sizes: current.sizes.filter((_, i) => i !== index), colors: current.colors.map((color) => ({ ...color, sizes: (color.sizes || []).filter((_, i) => i !== index) })) }));
  const setInventory = (value) => {
    setField("quantity", value);
    setForm((current) => ({ ...current, colors: current.colors.map((color) => (color.sizes || []).length ? color : ({ ...color, quantity: value })) }));
  };
  const updateColor = (index, key, value) => { setError(""); setFieldErrors((current) => ({ ...current, colorName: false, colorCode: false, variantInventory: false })); setForm((current) => ({ ...current, colors: current.colors.map((color, i) => i === index ? { ...color, [key]: value } : color) })); };
  const setColorFiles = (index, files) => setForm((current) => ({ ...current, colors: current.colors.map((color, i) => i === index ? { ...color, files, imageOrder: [...(color.imageOrder || (color.productPictures || []).map((pic) => ({ type: "existing", pic }))).filter((item) => item.type === "existing"), ...files.map((file) => ({ type: "new", file }))], featuredImageIndex: Math.min(Number(color.featuredImageIndex || 0), Math.max(0, (color.productPictures || []).length + files.length - 1)) } : color) }));
  const removeColorImage = (colorIndex, image) => setForm((current) => ({ ...current, colors: current.colors.map((color, i) => {
    if (i !== colorIndex) return color;
    const imageOrder = (color.imageOrder || []).filter((item) => item !== image);
    const files = image.type === "new" ? color.files.filter((file) => file !== image.file) : color.files;
    const selectedImage = color.imageOrder?.[Number(color.featuredImageIndex || 0)];
    const featuredImageIndex = image === selectedImage ? 0 : Math.max(0, imageOrder.indexOf(selectedImage));
    return { ...color, files, imageOrder, featuredImageIndex };
  }) }));
  const moveColorImage = (colorIndex, imageIndex, direction) => setForm((current) => ({ ...current, colors: current.colors.map((color, i) => {
    if (i !== colorIndex) return color;
    const imageOrder = [...(color.imageOrder || [])];
    const nextIndex = imageIndex + direction;
    if (nextIndex < 0 || nextIndex >= imageOrder.length) return color;
    const selectedImage = imageOrder[Number(color.featuredImageIndex || 0)];
    [imageOrder[imageIndex], imageOrder[nextIndex]] = [imageOrder[nextIndex], imageOrder[imageIndex]];
    return { ...color, imageOrder, featuredImageIndex: Math.max(0, imageOrder.indexOf(selectedImage)) };
  }) }));
  const addColor = () => setForm((current) => {
    const firstColor = current.colors[0];
    const inheritedSizes = (firstColor?.sizes?.length ? firstColor.sizes : current.sizes).map((size) => ({ ...size }));
    const colors = [...current.colors, { ...blankColor(), useProductPictures: current.colors.length === 0, price: firstColor?.price ?? "", quantity: firstColor?.quantity ?? current.quantity ?? "", sizes: inheritedSizes }];
    return { ...current, colors, sizes: current.colors.length ? current.sizes : [] };
  });
  const removeColor = (index) => setForm((current) => ({ ...current, colors: current.colors.filter((_, i) => i !== index) }));
  const removeMainImage = (item) => {
    setMainOrder((current) => current.filter((image) => image !== item));
    if (item.type === "existing") setMainExisting((current) => current.filter((pic) => pic.img !== item.pic.img));
    else setMainFiles((current) => current.filter((file) => file !== item.file));
    setForm((current) => ({ ...current, featuredImageIndex: 0 }));
    setNotice("Image removed from the edit form. Save changes to apply it.");
  };
  const moveMainImage = (index, direction) => {
    setMainOrder((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setForm((current) => ({ ...current, featuredImageIndex: 0 }));
  };

  const submit = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    const invalid = {};
    const allSizeRows = form.colors.length ? form.colors.flatMap((color) => color.sizes?.length ? color.sizes : form.sizes) : form.sizes;
    if (allSizeRows.some((size) => !size.size.trim() || !Number.isInteger(Number(size.quantity)) || Number(size.quantity) < 0)) invalid.sizes = true;
    if (!form.name.trim()) invalid.name = true;
    if (!form.category) invalid.category = true;
    if (form.price === "" || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) invalid.price = true;
    if (!form.description.trim()) invalid.description = true;
    const usedCustomGroups = form.customProductOptions.filter((group) => group.name?.trim() || group.options?.some((option) => option.value?.trim() || option.price !== ""));
    if (isPrinting && usedCustomGroups.some((group) => !group.name?.trim() || !group.options?.some((option) => option.value?.trim()) || group.options.some((option) => option.value?.trim() && (option.price === "" || !Number.isFinite(Number(option.price)) || Number(option.price) < 0)))) invalid.customProductOptions = true;
    if (form.colors.some((color) => !color.colorName.trim() && !(color.useProductPictures && form.defaultColorName.trim()))) invalid.colorName = true;
    if (form.colors.some((color) => !/^#[0-9a-fA-F]{6}$/.test(color.colorCode))) invalid.colorCode = true;
    if (form.colors.some((color) => color.useProductPictures) && !form.defaultColorName.trim()) invalid.defaultColorName = true;
    if (!mainFiles.length && !mainExisting.length && !form.colors.some((color) => color.files?.length || color.productPictures?.length)) invalid.images = true;
    const inheritedSizeRows = form.sizes.filter((size) => size.size.trim());
    const inventoryIsComplete = form.colors.length
      ? form.colors.every((color) => (color.sizes?.length || inheritedSizeRows.length) || color.quantity !== "" || form.quantity !== "")
      : form.sizes.length > 0 || (form.quantity !== "" && Number.isInteger(Number(form.quantity)) && Number(form.quantity) >= 0);
    if (!inventoryIsComplete) invalid.quantity = true;
    if ([...mainFiles, ...form.colors.flatMap((color) => color.files || [])].some((file) => file.type !== "image/webp" || file.size > 400 * 1024)) invalid.images = true;
    if (form.colors.some((color) => (color.price !== "" && (!Number.isFinite(Number(color.price)) || Number(color.price) < 0)) || (color.quantity !== "" && (!Number.isInteger(Number(color.quantity)) || Number(color.quantity) < 0)))) invalid.variantInventory = true;
    setFieldErrors(invalid);
    if (Object.keys(invalid).length) {
      const first = Object.keys(invalid)[0];
      const messages = { name: "Enter a product name.", category: "Select a product category.", price: "Enter a valid base price in PKR.", description: "Add a product description.", colorName: "Add a name to every color.", colorCode: "Choose a valid HEX color code for each color.", defaultColorName: "Name the color shown by the main product images.", images: "Add valid product images: WebP, 1000 × 1000 px, under 400 KB.", quantity: "Set inventory above, add sizes, or add stock to every color.", sizes: "Every size needs a name and a whole-number stock quantity of zero or more.", variantInventory: "Check each color price and inventory; values must be non-negative.", customProductOptions: "Each custom option needs a name, at least one choice, and a valid extra price for each choice." };
      setError(messages[first] || "Fix the highlighted fields and try again.");
      document.querySelector(`[data-product-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (isPrinting && form.customPrintOptions.some((option) => option.price === "" || !Number.isFinite(Number(option.price)) || Number(option.price) < 0)) { setError("Enter a valid PKR price for every enabled print placement."); return; }
    const data = new FormData();
    if (editing) data.append("productPictures", JSON.stringify(mainOrder.map((item) => item.type === "existing" ? { type: "existing", img: item.pic.img } : { type: "new", index: mainFiles.indexOf(item.file) })));
    ["name", "category", "price", "quantity", "description", "brandId", "offer", "dealLabel", "warranty", "defaultColorName", "featuredImageIndex", "customDesignGuidelines"].forEach((key) => data.append(key, form[key] ?? ""));
    ["discountEnabled", "dealEnabled", "reviewsEnabled", "requiresCustomerDesign", "allowDesignInstructions"].forEach((key) => data.append(key, String(Boolean(form[key]))));
    data.append("sizes", JSON.stringify(form.colors.length ? [] : form.sizes.filter((item) => item.size.trim())));
    data.append("specifications", JSON.stringify(form.specifications.filter((item) => item.name?.trim() && item.value?.trim())));
    data.append("customProductOptions", JSON.stringify(isPrinting ? usedCustomGroups.map((group) => ({ name: group.name.trim(), options: group.options.filter((option) => option.value?.trim()).map((option) => ({ value: option.value.trim(), price: Number(option.price) })) })) : []));
    data.append("customPrintOptions", JSON.stringify(isPrinting ? form.customPrintOptions : []));
    const colorsPayload = form.colors.map(({ files, ...color }, index) => {
      (files || []).forEach((file) => data.append(`colorPicture_${index}`, file));
      const imageOrder = color.imageOrder || [...(color.productPictures || []).map((pic) => ({ type: "existing", pic })), ...(files || []).map((file) => ({ type: "new", file }))];
      return { ...color, productPictures: imageOrder.filter((item) => item.type === "existing").map((item) => ({ img: item.pic.img })), imageOrder: imageOrder.map((item) => item.type === "existing" ? { type: "existing", img: item.pic.img } : { type: "new", index: files.indexOf(item.file) }), featuredImageIndex: Number(color.featuredImageIndex || 0), colorName: color.colorName || (color.useProductPictures ? form.defaultColorName : ""), price: color.price === "" ? undefined : Number(color.price), quantity: color.quantity === "" ? (form.quantity === "" ? undefined : Number(form.quantity)) : Number(color.quantity), sizes: ((color.sizes?.length ? color.sizes : form.sizes) || []).filter((item) => item.size.trim()) };
    });
    data.append("colors", JSON.stringify(colorsPayload));
    mainFiles.forEach((file) => data.append("productPicture", file));
    setBusy(true);
    try {
      const saved = editing ? await dispatch(updateProduct(editing._id, data)) : await dispatch(addProduct(data));
      if (!saved || saved.error) { throw new Error(saved?.error || productState.error || "The product could not be saved. Check the required fields and try again."); }
      if (isPrinting) {
        const expectedOptions = usedCustomGroups.map((group) => ({ name: group.name.trim(), options: group.options.filter((option) => option.value?.trim()).map((option) => ({ value: option.value.trim(), price: Number(option.price) })) }));
        const savedOptions = (saved.customProductOptions || []).map((group) => ({ name: String(group.name || "").trim(), options: (group.options || []).map((option) => ({ value: String(option.value || "").trim(), price: Number(option.price) })) }));
        if (JSON.stringify(savedOptions) !== JSON.stringify(expectedOptions)) throw new Error("The backend did not save all custom dropdown choices and prices. Restart the updated backend, then save this product again.");
      }
      setNotice(editing ? "Product changes saved successfully." : "Product added successfully."); await reload();
    } catch (e) { setError(e.response?.data?.error || e.response?.data?.message || e.message || "Could not save product."); }
    finally { setBusy(false); }
  };
  const removeProduct = async (product) => {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    setError(""); setNotice(""); setBusy(true);
    try { const ok = await dispatch(deleteProductById(product._id)); if (!ok || ok.error) throw new Error(ok?.error || productState.error || "Could not delete product."); setRows((current) => current.filter((item) => item._id !== product._id)); setNotice("Product deleted."); }
    catch (e) { setError(e.message || "Could not delete product."); }
    finally { setBusy(false); }
  };
  const addSpecification = () => setField("specifications", [...form.specifications, { name: "", value: "" }]);
  const editSpecification = (index, key, value) => setField("specifications", form.specifications.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const addCustomProductOption = () => setField("customProductOptions", [...form.customProductOptions, blankCustomProductOption()]);
  const editCustomProductOption = (groupIndex, key, value) => setField("customProductOptions", form.customProductOptions.map((group, i) => i === groupIndex ? { ...group, [key]: value } : group));
  const addCustomProductChoice = (groupIndex) => setField("customProductOptions", form.customProductOptions.map((group, i) => i === groupIndex ? { ...group, options: [...group.options, { value: "", price: "" }] } : group));
  const editCustomProductChoice = (groupIndex, choiceIndex, key, value) => setField("customProductOptions", form.customProductOptions.map((group, i) => i === groupIndex ? { ...group, options: group.options.map((option, j) => j === choiceIndex ? { ...option, [key]: value } : option) } : group));
  const formatDescription = (kind) => {
    const input = descriptionRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selection = form.description.slice(start, end) || (kind === "link" ? "Link text" : "text");
    let replacement = selection;
    if (kind === "bold") replacement = `**${selection}**`;
    if (kind === "bullet") replacement = selection.split("\n").map((line) => line.trim() ? `- ${line}` : line).join("\n");
    if (kind === "link") {
      const href = descriptionLink.trim();
      if (!/^(https?:\/\/|\/)/i.test(href)) { setError("Enter a valid link starting with https:// or /."); return; }
      replacement = `[${selection}](${href})`;
      setDescriptionLink("");
    }
    setField("description", `${form.description.slice(0, start)}${replacement}${form.description.slice(end)}`);
  };

  const previewCustomOptionTotal = form.customProductOptions.reduce((sum, group, index) => {
    const selected = group.options?.find((option) => option.value === previewCustomOptions[index]);
    return sum + Number(selected?.price || 0);
  }, 0);

  return <Layout sidebar><div className="products-page">
    <header className="products-page-header"><div><span className="products-eyebrow">CATALOG MANAGEMENT</span><h1>Products</h1><p>Manage listings, images, colors, sizes, and custom-print options.</p></div><div className="products-header-actions"><Button variant="outline-primary" onClick={() => { setCsvShow(true); setCsvError(""); setCsvStatus(""); }}>Import CSV</Button><Button variant="outline-primary" onClick={exportProducts}>Export CSV</Button><Button variant="primary" onClick={openCreate}>Add product</Button></div></header>
    {notice && !show && <Alert role="status" aria-live="polite" variant="success" dismissible onClose={() => setNotice("")}>{notice}</Alert>}{error && !show && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
    <div className="products-list-card"><div className="d-flex flex-wrap gap-2 justify-content-between align-items-center p-3"><strong>{visibleRows.length} products</strong><Form.Control aria-label="Search products" placeholder="Search products, brands, categories" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 360 }} /></div><div className="table-responsive"><Table hover className="products-table mb-0 align-middle"><thead><tr><th>Image</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{visibleRows.map((item) => { const image = item.productPictures?.[item.featuredImageIndex || 0]?.img || item.productPictures?.[0]?.img; return <tr key={item._id}><td>{image ? <img className="products-table-thumb" src={generatePublicUrl(image)} alt="" /> : "—"}</td><td><strong>{item.name}</strong><small className="d-block text-muted">{item.brand || "No brand"}</small></td><td>{item.category?.name || "—"}</td><td>Rs. {Number(item.price || 0).toLocaleString("en-PK")}</td><td>{item.quantity ?? 0}</td><td><div className="d-flex gap-2"><Button size="sm" variant="outline-primary" onClick={() => openEdit(item)}>Edit</Button><Button size="sm" variant="outline-danger" disabled={busy} onClick={() => removeProduct(item)}>Delete</Button></div></td></tr>; })}{!visibleRows.length && <tr><td colSpan="6" className="products-empty-cell">No products found.</td></tr>}</tbody></Table></div></div>

    <Modal show={csvShow} onHide={() => !csvBusy && setCsvShow(false)} size="lg" centered scrollable dialogClassName="product-modal product-csv-modal"><Modal.Header closeButton><div><Modal.Title>Product CSV import and export</Modal.Title><div className="small text-muted">Use CSV for product details and attach image files for upload.</div></div></Modal.Header><Modal.Body>
      <div className="product-csv-help"><h3>Import format</h3><p>Download a blank template, fill one product per row, then upload it. Category must match its full category path. Use JSON cells for sizes, colors, specifications, print prices, and custom product options.</p><p><strong>Images:</strong> put local WebP filenames in <code>image_files</code>, separated by <code>|</code>, then select those same files below. For color-specific pictures, add <code>"image_files":["red-front.webp"]</code> inside that color in <code>colors_json</code>. Use <code>"use_product_images":true</code> to reuse the main images for a color. Images are sent through the existing Multer product upload API.</p><p className="mb-0">Images must be WebP, at most 400 KB each, and at most 30 per product. Imports run sequentially (up to 100 rows) so a failed row does not undo earlier successful rows.</p></div>
      <div className="product-csv-examples"><strong>Example JSON cells</strong><code>{'sizes_json: [{"size":"M","quantity":5}]'}</code><code>{'colors_json: [{"colorName":"Black","colorCode":"#000000","quantity":5,"use_product_images":true}]'}</code><code>{'custom_product_options_json: [{"name":"Paper","options":[{"value":"300 GSM","price":250}]}]'}</code></div>
      <div className="product-csv-actions"><Button variant="outline-secondary" onClick={() => downloadCsv("subazen-products-template.csv", stringifyCsv(PRODUCT_CSV_COLUMNS, []))}>Download CSV template</Button><Button variant="outline-secondary" onClick={exportProducts}>Export current products</Button></div>
      <Form.Group className="mt-3"><Form.Label>CSV file</Form.Label><Form.Control ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { setCsvError(""); setCsvStatus(""); setCsvText(await file.text()); } }} /><Form.Text>CSV files are processed on this admin page and sent using your authenticated session.</Form.Text></Form.Group>
      <Form.Group className="mt-3"><Form.Label>Product image files referenced by the CSV</Form.Label><Form.Control type="file" accept="image/webp,.webp" multiple onChange={(event) => setCsvFiles(Array.from(event.target.files || []))} /><Form.Text>Select local images whose filenames appear in image_files and colors_json. Existing server filenames in an export are labels only; select the original image files when importing into another server.</Form.Text></Form.Group>
      {csvStatus && <Alert variant="info" className="mt-3 mb-0" aria-live="polite">{csvStatus}</Alert>}{csvError && <Alert variant="danger" className="mt-3 mb-0"><pre className="product-csv-errors">{csvError}</pre></Alert>}
    </Modal.Body><Modal.Footer><Button variant="outline-secondary" disabled={csvBusy} onClick={() => setCsvShow(false)}>Close</Button><Button variant="primary" disabled={csvBusy || !csvText} onClick={importProducts}>{csvBusy ? <><Spinner size="sm" className="me-2" />Importing…</> : "Import products"}</Button></Modal.Footer></Modal>

    <Modal show={show} onHide={close} size="xl" centered scrollable dialogClassName="product-modal"><Form onSubmit={submit} noValidate><Modal.Header closeButton><div><Modal.Title>{editing ? "Edit product" : "Add product"}</Modal.Title><div className="small text-muted">Fields marked optional can be left blank.</div></div></Modal.Header><Modal.Body>
      {notice && <Alert role="status" aria-live="polite" variant="success" dismissible onClose={() => setNotice("")}>{notice}</Alert>}{error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
      <section className="product-form-section"><h3>Product information</h3><div className="product-edit-grid">
        <Form.Group><Form.Label>Product name *</Form.Label><Form.Control data-product-field="name" isInvalid={fieldErrors.name} required value={form.name} onChange={(e) => setField("name", e.target.value)} /><Form.Control.Feedback type="invalid">Enter a product name.</Form.Control.Feedback></Form.Group>
        <Form.Group><Form.Label>Product category *</Form.Label><Form.Select data-product-field="category" isInvalid={fieldErrors.category} required value={form.category} onChange={(e) => { const category = categories.find((item) => item.value === e.target.value); setField("category", e.target.value); setField("brandId", ""); if (!printingCategory(category)) { setField("requiresCustomerDesign", false); setField("allowDesignInstructions", false); } }}><option value="">Select a product category</option>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Form.Select><Form.Control.Feedback type="invalid">Select a product category.</Form.Control.Feedback></Form.Group>
        <Form.Group><Form.Label>Brand <span className="text-muted">(optional)</span></Form.Label><Form.Select value={form.brandId} onChange={(e) => setField("brandId", e.target.value)}><option value="">No brand / direct product</option>{brands.filter((brand) => brand.isActive !== false).map((brand) => <option key={brand._id} value={brand._id}>{brand.name}</option>)}</Form.Select><Form.Text>Brands are optional. Manage brand assignments from the Brands page.</Form.Text></Form.Group>
        <Form.Group><Form.Label>Base price (PKR) *</Form.Label><Form.Control data-product-field="price" isInvalid={fieldErrors.price} type="number" min="0" step="1" required value={form.price} onChange={(e) => setField("price", e.target.value)} /><Form.Control.Feedback type="invalid">Enter a valid base price in PKR.</Form.Control.Feedback></Form.Group>
        <Form.Group><Form.Label>Inventory quantity</Form.Label><Form.Control data-product-field="quantity" isInvalid={fieldErrors.quantity} type="number" min="0" step="1" value={form.quantity} onChange={(e) => setInventory(e.target.value)} /><Form.Text>Enter total stock here, or add sizes below. When colors are added, stock and sizes are copied into each color and can be adjusted there.</Form.Text><Form.Control.Feedback type="invalid">Set inventory above, add sizes, or add stock to every color.</Form.Control.Feedback></Form.Group>
        <Form.Group className="product-edit-full"><Form.Label>Description *</Form.Label><div className="product-description-toolbar"><Button type="button" size="sm" variant="outline-secondary" onClick={() => formatDescription("bold")}><strong>B</strong></Button><Button type="button" size="sm" variant="outline-secondary" onClick={() => formatDescription("bullet")}>• List</Button><Form.Control aria-label="Link URL" placeholder="https://example.com or /page" value={descriptionLink} onChange={(e) => { setDescriptionLink(e.target.value); setError(""); }} /><Button type="button" size="sm" variant="outline-secondary" onClick={() => formatDescription("link")}>Add link</Button></div><Form.Control data-product-field="description" isInvalid={fieldErrors.description} ref={descriptionRef} as="textarea" rows={4} required value={form.description} onChange={(e) => setField("description", e.target.value)} /><Form.Text>Use the toolbar for bold text, bullet lists, and links.</Form.Text><Form.Control.Feedback type="invalid">Add a product description.</Form.Control.Feedback></Form.Group>
      </div></section>

      {!isPrinting && <section className="product-form-section product-custom-print product-custom-print-options"><h3>Printing &amp; custom product options <Badge bg="secondary">Category required</Badge></h3><p>Select a category under <strong>Printing &amp; Custom Products</strong> to configure the optional artwork upload and print-instructions fields here.</p></section>}
      {isPrinting && <section className="product-form-section product-custom-print product-custom-print-options"><h3>Printing &amp; custom product options <Badge bg="warning" text="dark">Optional</Badge></h3><div className="product-custom-print-design-toggle"><Form.Check className="mb-1" label="Show “Add your print design” container on the storefront" checked={Boolean(form.requiresCustomerDesign)} onChange={(e) => { setField("requiresCustomerDesign", e.target.checked); if (!e.target.checked) setField("allowDesignInstructions", false); }} /><Form.Text>Leave unchecked if customers do not need to upload artwork for this product.</Form.Text></div>{form.requiresCustomerDesign && <div className="product-custom-print-design-settings"><strong>Customer design fields</strong><Form.Check className="mt-2 mb-1" label="Show “Print instructions (optional)”" checked={Boolean(form.allowDesignInstructions)} onChange={(e) => setField("allowDesignInstructions", e.target.checked)} /><Form.Text>The artwork upload is required; print instructions are optional.</Form.Text></div>}</section>}

      <section className="product-form-section"><div className="product-colors-heading"><div><h3>Product images</h3><p>Arrange images below. Image 1 is the thumbnail. WebP only · 1000 × 1000 px · under 400 KB.</p></div><Badge bg="light" text="dark">Backend: src/uploads</Badge></div><Form.Control data-product-field="images" isInvalid={fieldErrors.images} type="file" accept="image/webp" multiple onChange={(e) => { const files = Array.from(e.target.files || []); setMainFiles(files); setMainOrder((current) => [...current.filter((item) => item.type === "existing"), ...files.map((file) => ({ type: "new", file }))]); setFieldErrors((current) => ({ ...current, images: false })); setError(""); }} /><Form.Control.Feedback type="invalid">Upload at least one WebP image under 400 KB.</Form.Control.Feedback><div className="product-edit-images mt-3">{mainOrder.map((item, i) => { const picture = item.type === "existing" ? item.pic : item.file; return <div className={`product-edit-image ${i === 0 ? "featured" : ""}`} key={item.type === "existing" ? `existing-${item.pic.img}` : `new-${item.file.name}-${i}`}><div className="product-image-order"><Badge bg={i === 0 ? "primary" : "secondary"}>{i + 1}{i === 0 ? " · Thumbnail" : ""}</Badge><div><Button type="button" size="sm" variant="outline-secondary" aria-label={`Move image ${i + 1} up`} disabled={i === 0} onClick={() => moveMainImage(i, -1)}>↑</Button><Button type="button" size="sm" variant="outline-secondary" aria-label={`Move image ${i + 1} down`} disabled={i === mainOrder.length - 1} onClick={() => moveMainImage(i, 1)}>↓</Button></div></div><img src={fileUrl(picture)} alt={`Product ${i + 1}`} />{item.type === "new" && <span>{item.file.name}</span>}<Button type="button" size="sm" variant="outline-danger" onClick={() => removeMainImage(item)}>Remove image</Button></div>; })}</div></section>

      <section className="product-form-section"><div className="product-colors-heading"><div><h3>Sizes and inventory <span className="text-muted">(optional)</span></h3><p>Customers choose an available size from a selector. Add sizes here once; they copy to every color so you can adjust each color’s stock below.</p></div><Button type="button" size="sm" variant="outline-primary" onClick={() => addSize()}>Add size</Button></div>{form.sizes.map((size, i) => <div className="product-size-row" key={`size-${i}`}><Form.Control data-product-field="sizes" isInvalid={fieldErrors.sizes && !size.size.trim()} aria-label="Size name" placeholder="e.g. S, M, L, XL" value={size.size} onChange={(e) => updateSize("sizes", i, "size", e.target.value)} /><Form.Control data-product-field="sizes" isInvalid={fieldErrors.sizes && (!Number.isInteger(Number(size.quantity)) || Number(size.quantity) < 0)} aria-label="Stock quantity" type="number" min="0" placeholder="Stock" value={size.quantity} onChange={(e) => updateSize("sizes", i, "quantity", e.target.value)} /><Button type="button" variant="outline-danger" onClick={() => removeSize(-1, i)}>Remove</Button></div>)}{fieldErrors.sizes && <div className="invalid-feedback d-block">Each size needs a name and a whole-number stock quantity.</div>}</section>

      <section className="product-form-section"><div className="product-colors-heading"><div><h3>Colors <span className="text-muted">(optional)</span></h3><p>Color is optional. Add a color name/code, images, price override, and inventory per size.</p></div><Button type="button" size="sm" variant="outline-primary" onClick={addColor}>Add color</Button></div>
        {form.colors.length > 0 && <Form.Group className="mb-3"><Form.Label>Default color for main product images *</Form.Label><Form.Control data-product-field="defaultColorName" isInvalid={fieldErrors.defaultColorName} placeholder="e.g. Black, White, Navy" value={form.defaultColorName} onChange={(e) => setField("defaultColorName", e.target.value)} /><Form.Text>The first product images are assigned to this color. Add more colors below; their galleries switch on the storefront without a page reload.</Form.Text><Form.Control.Feedback type="invalid">Name the color shown by the main images.</Form.Control.Feedback></Form.Group>}
        {form.colors.map((color, index) => <div className="product-color-editor" key={`color-${index}`}><div className="product-color-fields"><Form.Group><Form.Label>Color name *</Form.Label><Form.Control data-product-field="colorName" isInvalid={fieldErrors.colorName && !color.colorName.trim() && !(color.useProductPictures && form.defaultColorName.trim())} placeholder="Black" value={color.colorName} onChange={(e) => updateColor(index, "colorName", e.target.value)} /></Form.Group><Form.Group><Form.Label>Color code *</Form.Label><div className="product-color-code"><Form.Control type="color" value={/^#[0-9a-f]{6}$/i.test(color.colorCode) ? color.colorCode : "#000000"} onChange={(e) => updateColor(index, "colorCode", e.target.value)} /><Form.Control data-product-field="colorCode" isInvalid={fieldErrors.colorCode && !/^#[0-9a-f]{6}$/i.test(color.colorCode)} aria-label="HEX color" value={color.colorCode} onChange={(e) => updateColor(index, "colorCode", e.target.value)} /></div></Form.Group><Form.Group><Form.Label>Price override (PKR, optional)</Form.Label><Form.Control isInvalid={fieldErrors.variantInventory && color.price !== "" && (!Number.isFinite(Number(color.price)) || Number(color.price) < 0)} type="number" min="0" value={color.price} onChange={(e) => updateColor(index, "price", e.target.value)} /></Form.Group><Form.Group><Form.Label>Inventory (optional)</Form.Label><Form.Control isInvalid={fieldErrors.variantInventory && color.quantity !== "" && (!Number.isInteger(Number(color.quantity)) || Number(color.quantity) < 0)} type="number" min="0" value={color.quantity} onChange={(e) => updateColor(index, "quantity", e.target.value)} /><Form.Text>Use size stock below for apparel.</Form.Text></Form.Group></div>
          <Form.Check className="my-2" type="checkbox" label="Use the main product images for this color" checked={color.useProductPictures} onChange={(e) => updateColor(index, "useProductPictures", e.target.checked)} />
          {!color.useProductPictures && <><Form.Label>Images for {color.colorName || `color ${index + 1}`}</Form.Label><Form.Control type="file" accept="image/webp" multiple onChange={(e) => setColorFiles(index, Array.from(e.target.files || []))} /><Form.Text>WebP · 1000 × 1000 px · under 400 KB · white or transparent background.</Form.Text><div className="product-edit-images mt-2">{(color.imageOrder || (color.productPictures || []).map((pic) => ({ type: "existing", pic }))).map((item, i, imageOrder) => { const picture = item.type === "existing" ? item.pic : item.file; return <div className={`product-color-image ${Number(color.featuredImageIndex || 0) === i ? "featured" : ""}`} key={item.type === "existing" ? `color-existing-${item.pic.img}` : `color-new-${item.file.name}-${i}`}><div className="product-image-order"><Badge bg={i === 0 ? "primary" : "secondary"}>{i + 1}{i === 0 ? " · Thumbnail" : ""}</Badge><div><Button type="button" size="sm" variant="outline-secondary" aria-label={`Move ${color.colorName || "color"} image ${i + 1} up`} disabled={i === 0} onClick={() => moveColorImage(index, i, -1)}>↑</Button><Button type="button" size="sm" variant="outline-secondary" aria-label={`Move ${color.colorName || "color"} image ${i + 1} down`} disabled={i === imageOrder.length - 1} onClick={() => moveColorImage(index, i, 1)}>↓</Button></div></div><img src={fileUrl(picture)} alt={`${color.colorName} image ${i + 1}`} />{item.type === "new" && <span>{item.file.name}</span>}<Form.Check type="radio" label="Featured" name={`featured-${index}`} checked={Number(color.featuredImageIndex || 0) === i} onChange={() => updateColor(index, "featuredImageIndex", i)} /><Button type="button" size="sm" variant="outline-danger" onClick={() => removeColorImage(index, item)}>Remove image</Button></div>; })}</div></>}
          <div className="product-colors-heading mt-3"><strong>Size stock (optional)</strong><Button type="button" size="sm" variant="outline-secondary" onClick={() => addSize(index)}>Add size</Button></div>{color.sizes.map((size, i) => <div className="product-size-row" key={`color-${index}-size-${i}`}><Form.Control data-product-field="sizes" isInvalid={fieldErrors.sizes && !size.size.trim()} placeholder="Size (S, M, L, XL)" value={size.size} onChange={(e) => updateSize("sizes", i, "size", e.target.value, index)} /><Form.Control data-product-field="sizes" isInvalid={fieldErrors.sizes && (!Number.isInteger(Number(size.quantity)) || Number(size.quantity) < 0)} type="number" min="0" placeholder="Stock" value={size.quantity} onChange={(e) => updateSize("sizes", i, "quantity", e.target.value, index)} /><Button type="button" variant="outline-danger" onClick={() => removeSize(index, i)}>Remove</Button></div>)}<div className="text-end mt-3"><Button type="button" size="sm" variant="outline-danger" onClick={() => removeColor(index)}>Remove color</Button></div></div>)}
      </section>

      <section className="product-form-section product-promotion-fields"><h3>Discount, deal and reviews <span className="text-muted">(optional)</span></h3><div className="product-edit-grid"><Form.Check label="Enable percentage discount" checked={Boolean(form.discountEnabled)} onChange={(e) => setField("discountEnabled", e.target.checked)} /><Form.Group><Form.Label>Discount (%)</Form.Label><Form.Control type="number" min="0" max="99" value={form.offer ?? ""} onChange={(e) => setField("offer", e.target.value)} /></Form.Group><Form.Check label="Show a deal label" checked={Boolean(form.dealEnabled)} onChange={(e) => setField("dealEnabled", e.target.checked)} /><Form.Group><Form.Label>Deal label</Form.Label><Form.Control value={form.dealLabel || ""} onChange={(e) => setField("dealLabel", e.target.value)} /></Form.Group><Form.Check label="Allow customer reviews" checked={form.reviewsEnabled !== false} onChange={(e) => setField("reviewsEnabled", e.target.checked)} /></div></section>

      <section className="product-form-section"><h3>Product details <span className="text-muted">(optional)</span></h3><div className="product-edit-grid"><Form.Group><Form.Label>Warranty information</Form.Label><Form.Control as="textarea" rows={2} value={form.warranty || ""} onChange={(e) => setField("warranty", e.target.value)} /></Form.Group>{isPrinting && <Form.Group><Form.Label>Custom product guidelines</Form.Label><Form.Control as="textarea" rows={2} value={form.customDesignGuidelines || ""} onChange={(e) => setField("customDesignGuidelines", e.target.value)} /><Form.Text>Optional guidance shown to customers for artwork and printing.</Form.Text></Form.Group>}</div>{!isPrinting && <><div className="product-colors-heading mt-3"><strong>Specifications <span className="text-muted">(optional)</span></strong><Button type="button" size="sm" variant="outline-primary" onClick={addSpecification}>Add specification</Button></div>{form.specifications.map((item, i) => <div className="product-specification-row" key={`spec-${i}`}><Form.Control placeholder="Name (e.g. Material)" value={item.name} onChange={(e) => editSpecification(i, "name", e.target.value)} /><Form.Control placeholder="Value" value={item.value} onChange={(e) => editSpecification(i, "value", e.target.value)} /><Button type="button" variant="outline-danger" onClick={() => setField("specifications", form.specifications.filter((_, j) => j !== i))}>Remove</Button></div>)}</>}</section>

      {isPrinting && <section className="product-form-section product-custom-print"><h3>Print side and price <Badge bg="warning" text="dark">Optional</Badge></h3><p>Configure only the print placements offered for this product. Each amount is the full product price, not an added fee.</p>{placements.map(([key, label]) => { const option = form.customPrintOptions.find((item) => item.placement === key); return <div className="d-flex flex-wrap align-items-center gap-3 mb-2" key={key}><Form.Check type="checkbox" label={label} checked={Boolean(option)} onChange={(e) => setField("customPrintOptions", e.target.checked ? [...form.customPrintOptions, { placement: key, price: "", isAvailable: true }] : form.customPrintOptions.filter((item) => item.placement !== key))} />{option && <Form.Control aria-label={`${label} price`} type="number" min="0" placeholder="Full price in PKR" value={option.price} onChange={(e) => setField("customPrintOptions", form.customPrintOptions.map((item) => item.placement === key ? { ...item, price: e.target.value } : item))} style={{ maxWidth: 220 }} />}</div>; })}<div className="product-colors-heading mt-3"><div><strong>Additional product options <span className="text-muted">(optional)</span></strong><p className="small text-muted mb-0">Add a dropdown such as Paper quality, its choices, and the extra price for each choice. Prices are added to the product price.</p></div><Button type="button" size="sm" variant="outline-primary" onClick={addCustomProductOption}>Add option</Button></div>{form.customProductOptions.map((group, i) => <div className="product-specification-row product-custom-option-group" key={`custom-option-${i}`}><div className="product-custom-option-content"><Form.Control data-product-field="customProductOptions" aria-label="Option dropdown name" placeholder="e.g. Paper quality" value={group.name} onChange={(e) => editCustomProductOption(i, "name", e.target.value)} />{group.options.map((option, j) => <div className="product-custom-option-choice" key={`custom-option-${i}-choice-${j}`}><Form.Control aria-label={`${group.name || "Custom"} choice`} placeholder="e.g. 300 GSM" value={option.value} onChange={(e) => editCustomProductChoice(i, j, "value", e.target.value)} /><Form.Control aria-label={`${group.name || "Custom"} extra price`} type="number" min="0" placeholder="Extra price (PKR)" value={option.price} onChange={(e) => editCustomProductChoice(i, j, "price", e.target.value)} /><Button type="button" variant="outline-danger" disabled={group.options.length === 1} onClick={() => editCustomProductOption(i, "options", group.options.filter((_, k) => k !== j))}>Remove choice</Button></div>)}<Button type="button" size="sm" variant="outline-secondary" onClick={() => addCustomProductChoice(i)}>Add choice</Button></div><Button type="button" variant="outline-danger" onClick={() => setField("customProductOptions", form.customProductOptions.filter((_, j) => j !== i))}>Remove option</Button></div>)}</section>}

      <section className="product-live-preview"><div><span className="products-eyebrow">LIVE PREVIEW</span><h3>Storefront card and options</h3><p className="small text-muted mb-0">Preview the featured image, color, sizes, and print pricing before saving.</p></div>{form.colors.length > 0 && <div className="product-preview-swatches">{form.colors.map((color, index) => <button type="button" key={`preview-${index}`} className={previewColor === index ? "active" : ""} onClick={() => setPreviewColor(index)}><i style={{ background: color.colorCode }} />{color.colorName || form.defaultColorName || `Color ${index + 1}`}</button>)}</div>}{isPrinting && form.customPrintOptions.length > 0 && <Form.Select className="product-preview-print" aria-label="Preview print placement" value={previewPrint} onChange={(e) => setPreviewPrint(e.target.value)}><option value="">Base price</option>{form.customPrintOptions.map((option) => <option key={option.placement} value={option.placement}>{placements.find(([id]) => id === option.placement)?.[1]} · Rs. {Number(option.price || 0).toLocaleString("en-PK")}</option>)}</Form.Select>}{isPrinting && form.customProductOptions.map((group, index) => <Form.Select className="product-preview-print" key={`preview-option-${index}`} aria-label={`Preview ${group.name || "product option"}`} value={previewCustomOptions[index] || ""} onChange={(e) => setPreviewCustomOptions((current) => ({ ...current, [index]: e.target.value }))}><option value="">Select {group.name || "option"}</option>{(group.options || []).filter((option) => option.value?.trim()).map((option) => <option key={option.value} value={option.value}>{option.value} · +Rs. {Number(option.price || 0).toLocaleString("en-PK")}</option>)}</Form.Select>)}<div className="product-live-card">{(() => { const color = form.colors[previewColor]; const mainImages = mainOrder.map((item) => item.type === "existing" ? item.pic : item.file); const colorImages = color ? (color.useProductPictures ? mainImages : (color.imageOrder || []).map((item) => item.type === "existing" ? item.pic : item.file)) : mainImages; const image = colorImages[Number(color?.featuredImageIndex || 0)] || colorImages[0]; return image ? <img src={fileUrl(image)} alt="Product preview" /> : <div className="product-live-placeholder">Product image preview</div>; })()}<strong title={form.name}>{form.name || "Product name"}</strong><span>{brands.find((item) => String(item._id) === String(form.brandId))?.name || "No brand"}{form.colors[previewColor] ? ` · ${form.colors[previewColor].colorName || form.defaultColorName}` : ""}</span><b>Rs. {(Number(form.customPrintOptions.find((option) => option.placement === previewPrint)?.price || form.colors[previewColor]?.price || form.price || 0) + previewCustomOptionTotal).toLocaleString("en-PK")}</b>{Number(form.offer) > 0 && form.discountEnabled && <small>{form.offer}% off</small>}<span>{Number(form.quantity) > 0 || form.colors.some((c) => Number(c.quantity) > 0 || c.sizes?.some((s) => Number(s.quantity) > 0)) ? "In stock" : "Inventory is set per variant"}</span></div></section>
    </Modal.Body><Modal.Footer><Button variant="outline-secondary" type="button" onClick={close} disabled={busy}>Cancel</Button><Button variant="primary" type="submit" disabled={busy}>{busy ? <><Spinner size="sm" className="me-2" />Saving…</> : editing ? "Save changes" : "Create product"}</Button></Modal.Footer></Form></Modal>
  </div></Layout>;
}
