import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getProductsBySlug } from "../../../actions";
import ProductCard from "../../../components/UI/ProductCard";

/**
 * @author
 * @function ProductStore
 **/

const ProductStore = (props) => {
  const product = useSelector((state) => state.product);
  const priceRange = product.priceRange;
  const dispatch = useDispatch();

  useEffect(() => {
    const { match } = props;
    dispatch(getProductsBySlug(match.params.slug));
  }, []);

  return (
    <>
      {Object.keys(product.productsByPrice).map((key, index) => {
        return (
          <section
            key={key}
            className="product-store-section"
            style={{
              width: "calc(100% - 40px)",
              margin: "20px",
            }}
          >
            <h2>{product.categoryName || props.match.params.slug} · under Rs. {priceRange[key] || key.split(" - ")[1]}</h2>
            <div className="product-store-grid">
              {product.productsByPrice[key].map((item) => <ProductCard key={item._id} product={item} />)}
            </div>
          </section>
        );
      })}
    </>
  );
};

export default ProductStore;
