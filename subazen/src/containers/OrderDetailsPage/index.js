import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getOrder } from "../../actions";
import Layout from "../../components/Layout";
import Card from "../../components/UI/Card";
import Price from "../../components/UI/Price";
import { generatePublicUrl } from "../../urlConfig";
import usePageMeta from "../../hooks/usePageMeta";

import "./style.css";

/**
 * @author
 * @function OrderDetails
 **/

const OrderDetailsPage = (props) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const orderDetails = user.orderDetails;
  usePageMeta({ title: orderDetails?._id ? `Order ${String(orderDetails._id).slice(-8)} | Subazen` : "Order details | Subazen", description: "View the details and delivery status of your order.", canonical: `${window.location.origin}${props.location.pathname}`, robots: "noindex, nofollow" });

  useEffect(() => {
    console.log({ props });
    const payload = {
      orderId: props.match.params.orderId,
    };
    dispatch(getOrder(payload));
  }, []);

  const formatDate = (date) => {
    if (date) {
      const d = new Date(date);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }
    return "";
  };

  const formatDate2 = (date) => {
    const month = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "June",
      "July",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    if (date) {
      const d = new Date(date);
      return `${month[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }
  };

  if (!(orderDetails && orderDetails.address)) {
    return <Layout><main className="product-page-state" role={user.error ? "alert" : "status"}>{user.orderFetching ? "Loading order details…" : (user.error || "Order details are unavailable.")}</main></Layout>;
  }

  return (
    <Layout>
      <main className="order-details-page">
        <Card className="order-delivery-card">
          <div className="delAdrContainer">
            <div className="delAdrDetails">
              <div className="delTitle">Delivery Address</div>
              <div className="delName">{orderDetails.address.name}</div>
              <div className="delAddress">{orderDetails.address.address}</div>
              <div className="delPhoneNumber">
                Phone number {orderDetails.address.mobileNumber}
              </div>
            </div>
            <div className="delMoreActionContainer">
              <div className="delTitle">Payment summary</div>
              <div className="delTitle">Product subtotal</div><Price value={orderDetails.subtotal ?? 0} />
              <div className="delTitle">Shipping fee</div><Price value={orderDetails.shippingFee ?? 0} />
              <div className="delTitle">Grand total (COD)</div><Price value={orderDetails.totalAmount ?? 0} />
            </div>
          </div>
        </Card>

        {orderDetails.items.map((item, index) => (
          <Card className="order-detail-item-card" key={item._id || `${item.productId?._id || "item"}-${index}`}>
            <div className="order-detail-product">
              <div className="delItemImgContainer">
                {item.productId?.productPictures?.[0]?.img ? <img src={generatePublicUrl(item.productId.productPictures[0].img)} alt={item.productId?.name || "Unavailable product"} /> : <span>Image unavailable</span>}
              </div>
              <div className="order-detail-product-copy">
                <div className="delItemName">{item.productId?.name || "Product no longer available"}</div>
                {(item.colorName || item.size || item.printPlacement) && <div className="delItemName">{[item.colorName, item.size, item.printPlacement === "front-and-back" ? "Front and back print" : item.printPlacement ? `${item.printPlacement} print` : ""].filter(Boolean).join(" · ")}</div>}
                {(item.productOptionSelections || []).map((option) => <div className="delItemName" key={`${option.name}-${option.value}`}>{option.name}: {option.value}{Number(option.price) > 0 ? ` (+Rs. ${Number(option.price).toLocaleString("en-PK")})` : ""}</div>)}
                <div className="order-detail-quantity">Quantity: {item.purchasedQty || 1}</div>{Number(item.minOrderQuantity) > 1 && <div className="order-detail-quantity">Minimum order: {item.minOrderQuantity} units</div>}
                <Price value={Number(item.payablePrice || 0) * Number(item.purchasedQty || 1)} />
                {(item.designImage || item.designImageFront || item.designImageBack) && <div className="order-detail-customer-design">
                  <strong>Your uploaded files</strong>
                  {[["Front", item.designImageFront], ["Back", item.designImageBack]].filter(([, url]) => url).map(([side, url]) => <a key={side} href={generatePublicUrl(url)} target="_blank" rel="noreferrer">{/\.pdf(?:\?|$)/i.test(url) ? <span className="order-detail-pdf">PDF</span> : <img src={generatePublicUrl(url)} alt={`${side} artwork for ${item.productId?.name || "this product"}`} />}<span>Open {side} {/\.pdf(?:\?|$)/i.test(url) ? "PDF" : "image"}</span></a>)}
                  {!item.designImageFront && !item.designImageBack && item.designImage && <a href={generatePublicUrl(item.designImage)} target="_blank" rel="noreferrer">{/\.pdf(?:\?|$)/i.test(item.designImage) ? <span className="order-detail-pdf">PDF</span> : <img src={generatePublicUrl(item.designImage)} alt={`Uploaded design for ${item.productId?.name || "this product"}`} />}<span>Open {/\.pdf(?:\?|$)/i.test(item.designImage) ? "PDF" : "image"}</span></a>}
                  {item.designInstructions && <p><b>Order instructions:</b> {item.designInstructions}</p>}
                </div>}
              </div>
            </div>
            <div className="order-detail-tracking">
              <div className="orderTrack">
                {(orderDetails.orderStatus || []).map((status, statusIndex) => (
                  <div
                    key={`${status.type}-${statusIndex}`}
                    className={`orderStatus ${
                      status.isCompleted ? "active" : ""
                    }`}
                  >
                    <div
                      className={`point ${status.isCompleted ? "active" : ""}`}
                    ></div>
                    <div className="orderInfo">
                      <div className="status">{status.type}</div>
                      <div className="date">{formatDate(status.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-detail-delivered">
              {orderDetails.orderStatus?.[3]?.isCompleted &&
                `Delivered on ${formatDate2(orderDetails.orderStatus[3].date)}`}
            </div>
          </Card>
        ))}
      </main>
    </Layout>
  );
};

export default OrderDetailsPage;
