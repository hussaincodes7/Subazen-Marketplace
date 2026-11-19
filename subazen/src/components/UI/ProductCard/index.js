import React from "react";
import { Link } from "react-router-dom";
import Price from "../Price";
import { generatePublicUrl } from "../../../urlConfig";
import "./style.css";

export default function ProductCard({ product }) {
  const image = product.productPictures?.[product.featuredImageIndex || 0]?.img || product.productPictures?.[0]?.img;
  const available = Number(product.quantity || 0) > 0 || (product.sizes || []).some((size) => Number(size.quantity || 0) > 0) || (product.colors || []).some((variant) => Number(variant.quantity || 0) > 0 || (variant.sizes || []).some((size) => Number(size.quantity || 0) > 0));
  const originalPrice = Number(product.price || 0);
  const discountPercent = product.discountEnabled && Number(product.offer) > 0 && Number(product.offer) < 100 ? Number(product.offer) : 0;
  const currentPrice = discountPercent ? Math.round(originalPrice * (100 - discountPercent) / 100) : originalPrice;
  return <Link className="store-product-card" to={`/products/${product.slug}`} aria-label={product.name}>
    {image ? <img className="store-product-card-image" src={generatePublicUrl(image)} alt={product.name} loading="lazy" /> : <span className="store-product-card-image store-product-card-placeholder">Image unavailable</span>}
    <strong className="store-product-card-name" title={product.name}>{product.name}</strong>
    <div className="store-product-card-pricing"><Price value={currentPrice} />{discountPercent > 0 && <div className="store-product-card-discount"><del>Rs. {originalPrice.toLocaleString("en-PK")}</del><span>{discountPercent}% off</span></div>}</div>
    <small className={available ? "store-product-stock-in" : "store-product-stock-out"}>{available ? "In stock" : "Out of stock"}</small>
  </Link>;
}
