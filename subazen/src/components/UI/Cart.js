import React from "react";
import { FiShoppingCart } from "react-icons/fi";

/**
 * @author
 * @function Cart
 **/

const Cart = (props) => {
  return (
    <div className="cart-icon-wrap" aria-label={props.count > 0 ? `${props.count} items in cart` : "Cart is empty"}>
      {props.count > 0 && <span className="cart-count-badge" aria-hidden="true">{props.count > 99 ? "99+" : props.count}</span>}
      <FiShoppingCart aria-hidden="true" />
    </div>
  );
};

export default Cart;
