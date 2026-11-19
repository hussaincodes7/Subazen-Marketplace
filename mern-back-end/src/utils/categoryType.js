const contentPageWords = /\b(about|contact|privacy|policy|policies|terms|returns?|refunds?|shipping|delivery|faq|help|support|legal)\b/i;
const storeWords = /\b(shop|store|collection|collections|brands?|deals?|offers?)\b/i;
exports.inferCategoryType = (name, inheritedType = "") => {
  if (["page", "store", "product"].includes(inheritedType)) return inheritedType;
  const label = String(name || "").trim();
  if (contentPageWords.test(label)) return "page";
  if (storeWords.test(label)) return "store";
  return "product";
};
