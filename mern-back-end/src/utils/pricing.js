exports.getEffectiveUnitPrice = (product, variant = null) => {
  const basePrice = Number(variant?.price ?? product?.price ?? 0);
  const discountPercent = Number(product?.discountEnabled ? product?.offer : 0);
  if (!Number.isFinite(basePrice) || basePrice < 0) return 0;
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) return basePrice;
  return Math.round(basePrice * (100 - discountPercent) / 100);
};
