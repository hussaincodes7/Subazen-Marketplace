import React from "react";
import Card from "../../components/UI/Card";
import "./style.css";

/**
 * @author
 * @function PriceDetails
 **/

const PriceDetails = (props) => {
  return (
    <Card className="price-details-card" headerLeft={"Price details"}>
      <div className="price-details-body">
        <div className="price-details-row">
          <div>{props.shippingFee === undefined ? `Items subtotal (${props.totalItem} ${props.totalItem === 1 ? "item" : "items"})` : `Price (${props.totalItem} ${props.totalItem === 1 ? "item" : "items"})`}</div>
          <div>Rs. {Number(props.totalPrice || 0).toLocaleString("en-PK")}</div>
        </div>
        <div className="price-details-row">
          <div>Delivery Charges</div>
          <div>{props.shippingFee === undefined ? "Calculated at checkout" : `Rs. ${Number(props.shippingFee).toLocaleString("en-PK")}`}</div>
        </div>
        {props.shippingFee !== undefined && <div className="price-details-row price-details-total">
          <div>{props.shippingFee === undefined ? "Subtotal" : "Grand Total"}</div>
          <div>Rs. {(Number(props.totalPrice || 0) + Number(props.shippingFee || 0)).toLocaleString("en-PK")}</div>
        </div>}
      </div>
    </Card>
  );
};

export default PriceDetails;
