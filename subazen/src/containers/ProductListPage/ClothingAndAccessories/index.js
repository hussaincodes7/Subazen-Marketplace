import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getProductsBySlug } from "../../../actions";
import { Link } from "react-router-dom";

import "./style.css";
import { generatePublicUrl } from "../../../urlConfig";
import ProductCard from "../../../components/UI/ProductCard";

/**
 * @author
 * @function ClothingAndAccessories
 **/

const ClothingAndAccessories = (props) => {
  const product = useSelector((state) => state.product);
  const dispatch = useDispatch();
  const childCategories = product.childCategories || [];
  const categoryPath = product.categoryPath || [];

  useEffect(() => {
    const { match } = props;
    dispatch(getProductsBySlug(match.params.slug));
  }, [dispatch, props.match.params.slug]);

  const collectionLink = (category) => `/collections/${[...categoryPath.map((item) => item.slug), category.slug].filter(Boolean).join("/")}`;

  return (
    <div style={{ padding: "10px" }}>
      {childCategories.length > 0 && <section className="collection-brands" aria-label="Subcategories and brands">
        <h1>{product.category?.name || "Explore categories"}</h1>
        <div className="collection-brand-grid">{childCategories.map((category) => <Link className="collection-brand-card" key={category._id} to={collectionLink(category)}>
          {category.categoryImage ? <img src={generatePublicUrl(category.categoryImage)} alt="" loading="lazy" /> : <span className="collection-brand-placeholder">{category.name.charAt(0)}</span>}
          <strong>{category.name}</strong>
        </Link>)}</div>
      </section>}
      <div className="category-product-grid">
        {product.products.map((item) => <ProductCard key={item._id} product={item} />)}
      </div>
    </div>
  );
};

export default ClothingAndAccessories;
