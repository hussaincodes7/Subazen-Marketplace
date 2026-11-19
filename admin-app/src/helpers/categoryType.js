const pageWords = /\b(about|contact|privacy|policy|policies|terms|returns?|refunds?|shipping|delivery|faq|help|support|legal)\b/i;
const storeWords = /\b(shop|store|collection|collections|brand|brands|deals|offers)\b/i;

export const inferCategoryType = (name, inheritedType = "") => {
  if (["page", "store", "product"].includes(inheritedType)) return inheritedType;
  const label = String(name || "").trim();
  if (pageWords.test(label)) return "page";
  if (storeWords.test(label)) return "store";
  return "product";
};
