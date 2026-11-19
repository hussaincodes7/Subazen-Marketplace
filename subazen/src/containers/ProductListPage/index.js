import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import Layout from "../../components/Layout";
import getParams from "../../utils/getParams";
import ClothingAndAccessories from "./ClothingAndAccessories";
import ProductPage from "./ProductPage";
import ProductStore from "./ProductStore";
import "./style.css";
import usePageMeta from "../../hooks/usePageMeta";

/**
 * @author
 * @function ProductListPage
 **/

const ProductListPage = (props) => {
  const productState = useSelector((state) => state.product);
  const renderProduct = () => {
    console.log(props);
    const params = getParams(props.location.search);
    let content = null;
    switch (params.type) {
      case "store":
        content = <ProductStore {...props} />;
        break;
      case "page":
        content = <ProductPage {...props} />;
        break;
      default:
        content = <ClothingAndAccessories {...props} />;
    }

    return content;
  };

  const params = getParams(props.location.search);
  useEffect(() => {
    if (params.cid && props.location.pathname === `/${props.match.params.slug}` && params.type !== "page" && params.type !== "store") {
      props.history.replace(`/collections/${props.match.params.slug}`);
    }
  }, [params.cid, params.type, props.history, props.location.pathname, props.match.params.slug]);
  const categoryTitle = productState.category?.name || props.match.params.slug?.replace(/-/g, " ") || "Products";
  const titlePrefix = params.type === "page" ? "" : "Shop ";
  const canonical = `${window.location.origin}${props.location.pathname}`;
  const schema = params.type === "page" || !productState.category ? null : [{
    "@context": "https://schema.org", "@type": "CollectionPage", name: categoryTitle, description: `Shop ${categoryTitle} products at Subazen in Pakistan.`, url: canonical,
    ...(productState.products?.length ? { mainEntity: { "@type": "ItemList", itemListElement: productState.products.slice(0, 24).map((item, index) => ({ "@type": "ListItem", position: index + 1, url: `${window.location.origin}/products/${item.slug}`, name: item.name })) } } : {}),
  }];
  usePageMeta({
    title: props.match.params.slug ? `${titlePrefix}${categoryTitle} | Subazen` : "Browse products | Subazen",
    description: props.match.params.slug ? `Shop ${categoryTitle} and compare available products and prices at Subazen. Cash on Delivery in Pakistan.` : "Browse Subazen products by category, brand, or product type in Pakistan.",
    canonical,
    schema,
  });

  return <Layout>{renderProduct()}</Layout>;
};

export default ProductListPage;
