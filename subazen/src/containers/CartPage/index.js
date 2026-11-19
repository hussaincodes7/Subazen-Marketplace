import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../../components/Layout";
import CartItem from "./CartItem";
import { addToCart, getCartItems, removeCartItem } from "../../actions";
import PriceDetails from "../../components/PriceDetails";

import "./style.css";
import { MaterialButton } from "../../components/MaterialUI";
import usePageMeta from "../../hooks/usePageMeta";

/**
 * @author
 * @function CartPage
 **/

/*
Before Login
Add product to cart
save in localStorage
when try to checkout ask for credentials and 
if logged in then add products to users cart database from localStorage


*/

const CartPage = (props) => {
  const cart = useSelector((state) => state.cart);
  const auth = useSelector((state) => state.auth);
  // const cartItems = cart.cartItems;
  const [cartItems, setCartItems] = useState(cart.cartItems);
  const dispatch = useDispatch();
  const itemCount = Object.values(cartItems || {}).reduce((count, item) => count + Number(item.qty || 0), 0);
  const subtotal = Object.values(cartItems || {}).reduce((total, item) => total + Number(item.price || 0) * Number(item.qty || 0), 0);
  usePageMeta({ title: props.onlyCartItems ? "Checkout | Subazen" : "Your Cart | Subazen", description: props.onlyCartItems ? "Review your order items." : "Review your selected Subazen products and prices.", canonical: `${window.location.origin}${props.onlyCartItems ? "/checkout" : "/cart"}`, robots: "noindex, nofollow" });

  useEffect(() => {
    setCartItems(cart.cartItems);
  }, [cart.cartItems]);

  useEffect(() => {
    if (auth.authenticate) {
      dispatch(getCartItems());
    }
  }, [auth.authenticate]);

  const onQuantityIncrement = (cartKey) => {
    const item = cartItems[cartKey];
    dispatch(addToCart({ ...item, _id: item._id, cartKey }, 1));
  };

  const onQuantityDecrement = (cartKey) => {
    const item = cartItems[cartKey];
    dispatch(addToCart({ ...item, _id: item._id, cartKey }, -1));
  };

  const onRemoveCartItem = (item) => {
    dispatch(removeCartItem({ productId: item._id, variantId: item.variantId, size: item.size, printPlacement: item.printPlacement, productOptionSelections: item.productOptionSelections || [], designImage: item.designImage, designImageFront: item.designImageFront, designImageBack: item.designImageBack }));
  };

  if (props.onlyCartItems) {
    return (
      <>
        {Object.keys(cartItems).map((key, index) => (
          <CartItem
            key={index}
            cartItem={cartItems[key]}
            onQuantityInc={() => onQuantityIncrement(key)}
            onQuantityDec={() => onQuantityDecrement(key)}
            busy={cart.updatingCart}
          />
        ))}
      </>
    );
  }

  return (
    <Layout>
      <main className="cart-page">
        <div className="cart-page-heading"><div><span className="cart-eyebrow">YOUR SHOPPING BAG</span><h1>My Cart <small>{itemCount} {itemCount === 1 ? "item" : "items"}</small></h1></div><a href="/">Continue shopping</a></div>
        {!Object.keys(cartItems).length ? <section className="cart-empty-state"><div className="cart-empty-icon" aria-hidden="true">🛒</div><h2>Your cart is empty</h2><p>Find something you love and it will appear here.</p><a href="/">Browse products</a></section> : <>
          {cart.error && <div className="cart-error" role="alert">{cart.error}</div>}
          <div className="cart-layout">
            <section className="cart-items-panel"><header><h2>Items in your cart</h2><span>Cash on Delivery available</span></header>
              {Object.keys(cartItems).map((key) => <CartItem key={key} cartItem={cartItems[key]} onQuantityInc={() => onQuantityIncrement(key)} onQuantityDec={() => onQuantityDecrement(key)} onRemoveCartItem={() => onRemoveCartItem(cartItems[key])} busy={cart.updatingCart} />)}
              <div className="cart-panel-bottom"><span>Shipping is calculated after you enter your delivery address.</span><a href="/">Continue shopping</a></div>
            </section>
            <aside className="cart-summary-panel"><PriceDetails totalItem={itemCount} totalPrice={subtotal} /><div className="cart-summary-note"><span className="cart-check-mark">✓</span><p>Delivery charges are shown before you place the order.</p></div><div className="cart-summary-action"><MaterialButton title="Continue to checkout" onClick={() => props.history.push("/checkout")} /></div></aside>
          </div>
        </>}
      </main>
    </Layout>
  );
};

export default CartPage;
