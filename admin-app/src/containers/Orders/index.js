import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Button, Card, Container, Form } from "react-bootstrap";
import { getCustomerOrders, updateOrder } from "../../actions";
import Layout from "../../components/Layout";
import axios, { getApiErrorMessage } from "../../helpers/axios";
import { generatePublicUrl } from "../../urlConfig";

import "./style.css";

/**
 * @author
 * @function Orders
 **/

const Orders = (props) => {
  const order = useSelector((state) => state.order);
  const [selectedTypes, setSelectedTypes] = useState({});
  const [shippingFees, setShippingFees] = useState({});
  const [shippingError, setShippingError] = useState("");
  const [slipOrder, setSlipOrder] = useState(null);
  const [activeTab, setActiveTab] = useState("new");
  const [designDownloadError, setDesignDownloadError] = useState("");
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getCustomerOrders());
  }, [dispatch]);

  const onOrderUpdate = (orderId, type, directDelivery = false) => {
    dispatch(updateOrder({ orderId, type, directDelivery }));
    setSelectedTypes((current) => ({ ...current, [orderId]: "" }));
  };

  const printOrderSlip = (orderItem) => {
    setSlipOrder(orderItem);
    window.addEventListener("afterprint", () => setSlipOrder(null), { once: true });
    window.setTimeout(() => window.print(), 100);
  };

  const downloadCustomerDesign = async (imagePath, orderId) => {
    setDesignDownloadError("");
    try {
      const response = await axios.get(generatePublicUrl(imagePath), { responseType: "blob" });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = objectUrl;
      const extension = String(imagePath).match(/\.(jpe?g|png|webp)(?:\?|$)/i)?.[1] || "png";
      link.download = `subazen-order-${String(orderId).slice(-8)}-customer-design.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setDesignDownloadError(getApiErrorMessage(error, "Could not download the customer design."));
    }
  };

  const saveOrderShipping = async (orderId, currentFee) => {
    const shippingFee = Number(shippingFees[orderId] ?? currentFee);
    if (!Number.isFinite(shippingFee) || shippingFee < 0) {
      setShippingError("Enter a non-negative shipping fee.");
      return;
    }
    setShippingError("");
    try {
      await axios.patch(`/admin/order/${orderId}/shipping`, { shippingFee });
      dispatch(getCustomerOrders());
    } catch (error) {
      setShippingError(getApiErrorMessage(error, "Could not update this order's shipping fee."));
    }
  };

  const formatDate = (date) => {
    if (date) {
      const d = new Date(date);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }
    return "";
  };

  const allOrders = [...(order.orders || [])].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  const isFulfilled = (orderItem) => (orderItem.orderStatus || []).some((status) => status.type === "delivered" && status.isCompleted);
  const newOrders = allOrders.filter((orderItem) => !isFulfilled(orderItem));
  const fulfilledOrders = allOrders.filter(isFulfilled);
  const visibleOrders = activeTab === "fulfilled" ? fulfilledOrders : newOrders;

  return (
    <Layout sidebar>
      <Container fluid className="orders-page">
        <header className="orders-page-header">
          <div>
            <span className="orders-eyebrow">FULFILLMENT</span>
            <h1>Orders</h1>
            <p>Review customer orders and update their delivery progress.</p>
          </div>
        </header>
        {order.error && <Alert variant="danger">{order.error}</Alert>}
        {shippingError && <Alert variant="danger" role="alert">{shippingError}</Alert>}
        {designDownloadError && <Alert variant="danger" role="alert">{designDownloadError}</Alert>}
        {order.loading && !order.orders?.length && <div className="orders-empty-state">Loading orders…</div>}
        {Boolean(order.orders?.length) && <div className="orders-tabs" role="tablist" aria-label="Order groups">
          <button type="button" role="tab" aria-selected={activeTab === "new"} className={activeTab === "new" ? "active" : ""} onClick={() => setActiveTab("new")}>New orders <span>{newOrders.length}</span></button>
          <button type="button" role="tab" aria-selected={activeTab === "fulfilled"} className={activeTab === "fulfilled" ? "active" : ""} onClick={() => setActiveTab("fulfilled")}>Fulfilled <span>{fulfilledOrders.length}</span></button>
        </div>}
        {!order.loading && !order.orders?.length && <div className="orders-empty-state">No customer orders yet.</div>}
        {!order.loading && Boolean(order.orders?.length) && !visibleOrders.length && <div className="orders-empty-state">{activeTab === "fulfilled" ? "No delivered orders yet." : "No new orders to fulfill."}</div>}
        {visibleOrders.map((orderItem) => (
          <Card className="order-card" key={orderItem._id}>
            <Card.Header className="order-card-header">
              <span>Order <strong>{orderItem._id}</strong></span>
              <span>{formatDate(orderItem.createdAt)}</span>
              {activeTab === "new" && <Button type="button" size="sm" variant="outline-primary" onClick={() => printOrderSlip(orderItem)}>Print order slip</Button>}
            </Card.Header>
            <Card.Body>
              <div className="order-summary">
            <div>
              <span className="title">Customer</span><br />
              <span className="value">{orderItem.user ? `${orderItem.user.firstName} ${orderItem.user.lastName} · ${orderItem.user.email}` : "Customer details unavailable"}</span>
              {orderItem.addressSnapshot && <div className="value">{orderItem.addressSnapshot.address}, {orderItem.addressSnapshot.city}, {orderItem.addressSnapshot.state}</div>}
            </div>
            <div>
              <div className="title">Items</div>
              {(orderItem.items || []).map((item, index) => (
                <div className="value" key={item._id || index}>
                  {item.productId?.name || "Product no longer available"} × {item.purchasedQty}
                  {(item.colorName || item.size || item.printPlacement) && <span className="text-muted"> · {[item.colorName, item.size, item.printPlacement === "front-and-back" ? "Front and back print" : item.printPlacement ? `${item.printPlacement} print` : ""].filter(Boolean).join(" / ")}</span>}
                  {(item.productOptionSelections || []).length > 0 && <div className="text-muted">{item.productOptionSelections.map((option) => `${option.name}: ${option.value}${Number(option.price) > 0 ? ` (+Rs. ${Number(option.price).toLocaleString("en-PK")})` : ""}`).join(" · ")}</div>}
                  {(item.designImage || item.designImageFront || item.designImageBack) && <div className="order-customer-design">
                    {[["Front artwork", item.designImageFront], ["Back artwork", item.designImageBack]].filter(([, url]) => url).map(([label, url]) => <div className="order-customer-design-side" key={label}><a href={generatePublicUrl(url)} target="_blank" rel="noreferrer" aria-label={`Open ${label} for ${item.productId?.name || "order item"}`}><img src={generatePublicUrl(url)} alt={`${label} for ${item.productId?.name || "order item"}`} loading="lazy" /></a><div><strong>{label}</strong><div className="order-customer-design-actions"><a href={generatePublicUrl(url)} target="_blank" rel="noreferrer">Open image</a><button type="button" onClick={() => downloadCustomerDesign(url, `${orderItem._id}-${label}`)}>Download</button></div></div></div>)}
                    {!item.designImageFront && !item.designImageBack && item.designImage && <div className="order-customer-design-side"><a href={generatePublicUrl(item.designImage)} target="_blank" rel="noreferrer"><img src={generatePublicUrl(item.designImage)} alt={`Customer design for ${item.productId?.name || "order item"}`} loading="lazy" /></a><div><strong>Customer design</strong><div className="order-customer-design-actions"><a href={generatePublicUrl(item.designImage)} target="_blank" rel="noreferrer">Open image</a><button type="button" onClick={() => downloadCustomerDesign(item.designImage, orderItem._id)}>Download</button></div></div></div>}
                    {item.designInstructions && <p><strong>Print instructions:</strong> {item.designInstructions}</p>}
                  </div>}
                </div>
              ))}
            </div>
            <div>
              <span className="title">Product subtotal</span><br />
              <span className="value">Rs. {Number(orderItem.subtotal || 0).toLocaleString("en-PK")}</span>
            </div>
            <div>
              <span className="title">Shipping fee</span><br />
              <span className="value">Rs. {Number(orderItem.shippingFee || 0).toLocaleString("en-PK")}</span>
            </div>
            <div>
              <span className="title">Grand total</span><br />
              <span className="value">Rs. {Number(orderItem.totalAmount || 0).toLocaleString("en-PK")}</span>
            </div>
            <div>
              <span className="title">Payment Type</span> <br />
              <span className="value">{orderItem.paymentType}</span>
            </div>
            <div>
              <span className="title">Payment Status</span> <br />
              <span className="value">{orderItem.paymentStatus}</span>
            </div>
          </div>
          {activeTab === "new" && <div className="order-shipping-controls mt-3">
            <Form.Control aria-label={`Shipping fee for order ${orderItem._id}`} type="number" min="0" step="1" value={shippingFees[orderItem._id] ?? orderItem.shippingFee ?? 0} onChange={(event) => setShippingFees((fees) => ({ ...fees, [orderItem._id]: event.target.value }))} />
            <Button variant="outline-primary" onClick={() => saveOrderShipping(orderItem._id, orderItem.shippingFee)} disabled={order.loading}>Save shipping fee</Button>
          </div>}
          <div className={`order-card-footer ${activeTab === "fulfilled" ? "read-only" : ""}`}>
            <div className="orderTrack">
              {(orderItem.orderStatus || []).map((status) => (
                <div
                  key={`${orderItem._id}-${status.type}`}
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

            {activeTab === "new" && <div className="order-phase-controls">
              <Form.Select aria-label={`Shipment phase for order ${orderItem._id}`} value={selectedTypes[orderItem._id] || ""} onChange={(e) => setSelectedTypes((current) => ({ ...current, [orderItem._id]: e.target.value }))}>
                <option value={""}>Select a shipment phase</option>
                {(orderItem.orderStatus || []).filter((status) => !status.isCompleted).map((status) => <option key={status.type} value={status.type}>{status.type}</option>)}
              </Form.Select>
              <div className="order-phase-buttons">
                <Button disabled={!selectedTypes[orderItem._id] || order.loading} onClick={() => onOrderUpdate(orderItem._id, selectedTypes[orderItem._id])}>Update status</Button>
                {orderItem.canDirectDeliver && !(orderItem.orderStatus || []).some((status) => ["shipped", "delivered"].includes(status.type) && status.isCompleted) && <Button variant="outline-success" disabled={order.loading} onClick={() => onOrderUpdate(orderItem._id, "delivered", true)}>Mark delivered (same city)</Button>}
              </div>
            </div>}
          </div>
          </Card.Body>
        </Card>
      ))}
      {slipOrder && <section className="order-print-slip" aria-label="Printable order slip">
        <header><h1>Subazen</h1><strong>ORDER SLIP</strong></header>
        <p><b>Order ID:</b> {slipOrder._id}</p>
        <p><b>Order date:</b> {formatDate(slipOrder.createdAt)}</p>
        <h2>Deliver to</h2>
        <p>{slipOrder.addressSnapshot?.name || `${slipOrder.user?.firstName || ""} ${slipOrder.user?.lastName || ""}`}</p>
        <p>{slipOrder.addressSnapshot?.mobileNumber || ""}</p>
        <p>{[slipOrder.addressSnapshot?.address, slipOrder.addressSnapshot?.city, slipOrder.addressSnapshot?.state, slipOrder.addressSnapshot?.pinCode].filter(Boolean).join(", ")}</p>
        <table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{(slipOrder.items || []).map((item, index) => <tr key={item._id || index}><td>{item.productId?.name || "Product"}{(item.colorName || item.size || item.printPlacement) && ` · ${[item.colorName, item.size, item.printPlacement === "front-and-back" ? "Front and back print" : item.printPlacement ? `${item.printPlacement} print` : ""].filter(Boolean).join(" / ")}`}{(item.productOptionSelections || []).map((option) => <div key={`${option.name}-${option.value}`}>{option.name}: {option.value}{Number(option.price) > 0 ? ` (+Rs. ${Number(option.price).toLocaleString("en-PK")})` : ""}</div>)}{(item.designImage || item.designImageFront || item.designImageBack) && <div>{item.designImageFront && <div>Front artwork: {generatePublicUrl(item.designImageFront)}</div>}{item.designImageBack && <div>Back artwork: {generatePublicUrl(item.designImageBack)}</div>}{!item.designImageFront && !item.designImageBack && item.designImage && <div>Customer design: {generatePublicUrl(item.designImage)}</div>}{item.designInstructions && <div>Print instructions: {item.designInstructions}</div>}</div>}</td><td>{item.purchasedQty}</td><td>Rs. {(Number(item.payablePrice || 0) * Number(item.purchasedQty || 0)).toLocaleString("en-PK")}</td></tr>)}</tbody></table>
        <div className="order-slip-total"><p>Product subtotal <b>Rs. {Number(slipOrder.subtotal || 0).toLocaleString("en-PK")}</b></p><p>Shipping fee <b>Rs. {Number(slipOrder.shippingFee || 0).toLocaleString("en-PK")}</b></p><p>Grand total (COD) <b>Rs. {Number(slipOrder.totalAmount || 0).toLocaleString("en-PK")}</b></p></div>
        <p className="order-slip-note">Payment method: Cash on Delivery</p>
      </section>}
      </Container>
    </Layout>
  );
};

export default Orders;
