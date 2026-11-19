import axios from "../helpers/axios";
import { cartConstants } from "./constants";
import store from "../store";
const cartKeyFor = (product) => product.cartKey || `${product._id}${product.variantId ? `_${product.variantId}` : ""}${product.size ? `_${encodeURIComponent(product.size)}` : ""}${product.printPlacement ? `_print_${product.printPlacement}` : ""}${product.productOptionSelections?.length ? `_options_${encodeURIComponent(JSON.stringify(product.productOptionSelections.map(({ name, value }) => ({ name, value }))))}` : ""}${product.designImageFront ? `_front_${encodeURIComponent(product.designImageFront.split("/").pop())}` : ""}${product.designImageBack ? `_back_${encodeURIComponent(product.designImageBack.split("/").pop())}` : ""}${product.designImage && !product.designImageFront && !product.designImageBack ? `_design_${encodeURIComponent(product.designImage.split("/").pop())}` : ""}`;
export const getCartItems = () => async (dispatch) => {
  dispatch({ type: cartConstants.ADD_TO_CART_REQUEST });
  try {
    const res = await axios.post("/user/getCartItems");
    const items = res.data?.cartItems || {};
    dispatch({ type: cartConstants.ADD_TO_CART_SUCCESS, payload: { cartItems: items } });
    return items;
  } catch (error) {
    dispatch({ type: cartConstants.ADD_TO_CART_FAILURE, payload: { error: error.response?.data?.message || error.message } });
    return null;
  }
};
export const addToCart = (product, delta = 1) => async (dispatch) => {
  const { auth, cart } = store.getState();
  const cartItems = { ...cart.cartItems };
  const key = cartKeyFor(product);
  const nextQty = Math.max(1, Number(cartItems[key]?.qty || 0) + Number(delta));
  if (Number(product.stock ?? Infinity) < nextQty) {
    dispatch({ type: cartConstants.ADD_TO_CART_FAILURE, payload: { error: `Only ${product.stock} of this option are available.` } });
    return false;
  }
  cartItems[key] = { ...product, cartKey: key, qty: nextQty };
  if (auth.authenticate) {
    dispatch({ type: cartConstants.ADD_TO_CART_REQUEST });
    try {
      await axios.post("/user/cart/addtocart", { cartItems: [{ product: product._id, variantId: product.variantId || undefined, colorName: product.colorName || undefined, size: product.size || undefined, printPlacement: product.printPlacement || undefined, productOptionSelections: product.productOptionSelections || [], designImage: product.designImage || undefined, designImageFront: product.designImageFront || undefined, designImageBack: product.designImageBack || undefined, designInstructions: product.designInstructions || undefined, quantity: nextQty }] });
      const freshItems = await dispatch(getCartItems());
      const optionKey = JSON.stringify((product.productOptionSelections || []).map(({ name, value }) => ({ name, value })));
      if (!freshItems || !Object.values(freshItems).some((item) => item._id === product._id && item.variantId === (product.variantId || "") && item.printPlacement === (product.printPlacement || "") && item.size === (product.size || "") && JSON.stringify((item.productOptionSelections || []).map(({ name, value }) => ({ name, value }))) === optionKey && item.designImageFront === (product.designImageFront || "") && item.designImageBack === (product.designImageBack || ""))) {
        dispatch({ type: cartConstants.ADD_TO_CART_FAILURE, payload: { error: "The server saved the request but did not return this item in your cart. Please try again." } });
        return false;
      }
    } catch (error) {
      dispatch({ type: cartConstants.ADD_TO_CART_FAILURE, payload: { error: error.response?.data?.message || error.message } });
      return false;
    }
  } else {
    localStorage.setItem("cart", JSON.stringify(cartItems));
    dispatch({ type: cartConstants.ADD_TO_CART_SUCCESS, payload: { cartItems } });
  }
  return true;
};
export const removeCartItem = (payload) => async (dispatch) => {
  const { auth, cart } = store.getState();
  if (!auth.authenticate) {
    const key = Object.keys(cart.cartItems).find((cartKey) => {
      const item = cart.cartItems[cartKey];
      return String(item._id) === String(payload.productId) && String(item.variantId || "") === String(payload.variantId || "") && String(item.size || "") === String(payload.size || "") && String(item.printPlacement || "") === String(payload.printPlacement || "") && JSON.stringify((item.productOptionSelections || []).map(({ name, value }) => ({ name, value }))) === JSON.stringify((payload.productOptionSelections || []).map(({ name, value }) => ({ name, value }))) && String(item.designImage || "") === String(payload.designImage || "") && String(item.designImageFront || "") === String(payload.designImageFront || "") && String(item.designImageBack || "") === String(payload.designImageBack || "");
    });
    if (!key) return false;
    const cartItems = { ...cart.cartItems };
    delete cartItems[key];
    localStorage.setItem("cart", JSON.stringify(cartItems));
    dispatch({ type: cartConstants.ADD_TO_CART_SUCCESS, payload: { cartItems } });
    return true;
  }
  try {
    dispatch({ type: cartConstants.REMOVE_CART_ITEM_REQUEST });
    const res = await axios.post("/user/cart/removeCartItems", { payload });
    if (res.status === 200) { dispatch({ type: cartConstants.REMOVE_CART_ITEM_SUCCESS }); dispatch(getCartItems()); return true; }
  } catch (error) {
    dispatch({ type: cartConstants.REMOVE_CART_ITEM_FAILURE, payload: { error: error.response?.data?.message || error.message } });
  }
  return false;
};
export const updateCart = () => async (dispatch) => {
  const { auth } = store.getState();
  let cartItems = {};
  try { cartItems = JSON.parse(localStorage.getItem("cart") || "{}"); } catch { localStorage.removeItem("cart"); }
  if (auth.authenticate) {
    localStorage.removeItem("cart");
    if (Object.keys(cartItems).length) {
      const items = Object.values(cartItems).map((item) => ({ product: item._id, variantId: item.variantId || undefined, colorName: item.colorName || undefined, size: item.size || undefined, printPlacement: item.printPlacement || undefined, productOptionSelections: item.productOptionSelections || [], designImage: item.designImage || undefined, designImageFront: item.designImageFront || undefined, designImageBack: item.designImageBack || undefined, designInstructions: item.designInstructions || undefined, quantity: item.qty }));
      try { await axios.post("/user/cart/addtocart", { cartItems: items }); } catch (error) { console.error("Cart sync failed", error); }
    }
    return dispatch(getCartItems());
  }
  dispatch({ type: cartConstants.ADD_TO_CART_SUCCESS, payload: { cartItems } });
};
