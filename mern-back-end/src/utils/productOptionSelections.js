exports.getProductOptionGroups = (product) => {
  if (Array.isArray(product?.customProductOptions) && product.customProductOptions.length) return product.customProductOptions;
  const groups = new Map();
  (product?.specifications || []).forEach((item) => {
    const name = String(item.name || "").trim();
    const value = String(item.value || "").trim();
    if (!name || !value) return;
    const key = name.toLowerCase();
    if (!groups.has(key)) groups.set(key, { name, options: [] });
    groups.get(key).options.push({ value });
  });
  return [...groups.values()];
};

exports.resolveProductOptionSelections = (groups = [], requested = []) => {
  const selections = Array.isArray(requested) ? requested : [];
  if (!Array.isArray(groups) || !groups.length) {
    if (selections.length) throw new Error("This product has no custom options.");
    return [];
  }
  return groups.map((group) => {
    const selection = selections.find((item) => String(item.name || "") === String(group.name || ""));
    if (!selection) throw new Error(`Choose an option for ${group.name}.`);
    const option = (group.options || []).find((item) => String(item.value || "") === String(selection.value || ""));
    if (!option) throw new Error(`Choose a valid option for ${group.name}.`);
    return { name: String(group.name), value: String(option.value), price: Number(option.price || 0) };
  });
};
