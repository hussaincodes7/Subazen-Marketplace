import React, { useEffect, useState } from "react";
import { generatePublicUrl } from "../../../urlConfig";
import "./style.css";

/**
 * @author
 * @function CartItem
 **/

const CartItem = (props) => {
  const [imageFailed, setImageFailed] = useState(false);
  const qty = props.cartItem.qty;

  const { name, price, img, colorName, colorCode, size, printPlacement, designImage, designImageFront, designImageBack, designInstructions } = props.cartItem;
  const imageUrl = generatePublicUrl(img);
  const designUrl = generatePublicUrl(designImage);

  useEffect(() => setImageFailed(false), [imageUrl]);

  const onQuantityIncrement = () => {
    props.onQuantityInc();
  };

  const onQuantityDecrement = () => {
    if (qty <= 1) return;
    props.onQuantityDec();
  };

  return (
    <article className="cartItemContainer">
      <div className="cartProImgContainer">
        {imageUrl && !imageFailed ? <img src={imageUrl} alt={name} onError={() => setImageFailed(true)} /> : <span aria-hidden="true">Image unavailable</span>}
      </div>
      <div className="cartItemDetails">
        <div className="cartItemDescription">
          <h2>{name}</h2>
          {(colorName || size || printPlacement) && <div className="cartItemVariant">
            {colorName && <span><i style={{ backgroundColor: colorCode || "#e5e7eb" }} />{colorName}</span>}
            {size && <span>Size: {size}</span>}
            {printPlacement && <span>Print: {printPlacement === "front-and-back" ? "Front and back" : printPlacement}</span>}
          </div>}
          {(props.cartItem.productOptionSelections || []).length > 0 && <div className="cartItemVariant">{props.cartItem.productOptionSelections.map((option) => <span key={`${option.name}-${option.value}`}>{option.name}: {option.value}{Number(option.price) > 0 ? ` (+Rs. ${Number(option.price).toLocaleString("en-PK")})` : ""}</span>)}</div>}
          {(designUrl || designImageFront || designImageBack) && <div className="cart-custom-design"><span>Customer artwork</span>{[["Front", designImageFront], ["Back", designImageBack]].filter(([, url]) => url).map(([side, url]) => { const href = generatePublicUrl(url); return <a key={side} href={href} target="_blank" rel="noreferrer"><img src={href} alt={`${side} artwork for ${name}`} />Open {side.toLowerCase()} artwork</a>; })}{!designImageFront && !designImageBack && designUrl && <a href={designUrl} target="_blank" rel="noreferrer"><img src={designUrl} alt={`Uploaded design for ${name}`} />Open design</a>}{designInstructions && <p><strong>Print instructions:</strong> {designInstructions}</p>}</div>}
          <strong className="cartItemPrice">Rs. {Number(price || 0).toLocaleString("en-PK")}</strong>
          <div className="quantityControl" aria-label={`Quantity for ${name}`}>
            <button type="button" aria-label={`Decrease ${name} quantity`} onClick={onQuantityDecrement} disabled={qty <= 1 || props.busy}>−</button>
            <span aria-live="polite">{qty}</span>
            <button type="button" aria-label={`Increase ${name} quantity`} onClick={onQuantityIncrement} disabled={props.busy}>+</button>
          </div>
          {props.onRemoveCartItem && <button type="button" className="cartActionBtn" onClick={props.onRemoveCartItem} disabled={props.busy}>Remove</button>}
        </div>
        {qty > 1 && <div className="cartItemLineTotal"><span>Item total</span><strong>Rs. {(Number(price || 0) * Number(qty || 0)).toLocaleString("en-PK")}</strong></div>}
      </div>
    </article>
  );
};

export default CartItem;
