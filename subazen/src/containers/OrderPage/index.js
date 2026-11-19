import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { getOrders } from "../../actions";
import Layout from "../../components/Layout";
import Card from "../../components/UI/Card";
import Price from "../../components/UI/Price";
import { IoIosArrowForward } from "react-icons/io";
import { Breed } from "../../components/MaterialUI";
import { generatePublicUrl } from "../../urlConfig";
import usePageMeta from "../../hooks/usePageMeta";
import "./style.css";

const OrderPage = (props) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  usePageMeta({ title: "My Orders | Subazen", description: "View your Subazen orders and delivery status.", canonical: `${window.location.origin}/account/orders`, robots: "noindex, nofollow" });

  useEffect(() => {
    dispatch(getOrders());
  }, [dispatch]);

  const formatDate = (date) => date ? new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date)) : "Date unavailable";

  return (
    <Layout>
      <main className="orders-page">
        <Breed
          breed={[
            { name: "Home", href: "/" },
            { name: "My Account", href: "/account" },
            { name: "My Orders", href: "/account/orders" },
          ]}
          breedIcon={<IoIosArrowForward />}
        />
        <header className="orders-heading">
          <span>YOUR ACCOUNT</span>
          <h1>My orders</h1>
          <p>See your items, order totals, and delivery progress.</p>
        </header>

        {user.orderFetching ? <div className="orders-state">Loading your orders…</div>
          : user.error ? <div className="orders-state orders-state-error" role="alert">{user.error}</div>
            : user.orders.length === 0 ? <div className="orders-state"><h2>No orders yet</h2><p>Your orders will appear here after checkout.</p><Link to="/">Browse products</Link></div>
              : <div className="orders-list">
                {user.orders.map((order) => {
                  const currentStatus = [...(order.orderStatus || [])].reverse().find((status) => status.isCompleted)?.type || "ordered";
                  return <Card className="order-card" key={order._id}>
                    <header className="order-card-header">
                      <div className="order-reference"><span>ORDER</span><strong>#{String(order._id).slice(-8).toUpperCase()}</strong><time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time></div>
                      <div className="order-state-summary"><strong>{currentStatus}</strong><span>{order.paymentType === "cod" ? "Cash on Delivery" : order.paymentType} · {order.paymentStatus}</span></div>
                    </header>
                    <div className="order-products">
                      {(order.items || []).map((item, index) => {
                        const product = item.productId;
                        const image = product?.productPictures?.[0]?.img;
                        const lineTotal = Number(item.payablePrice || 0) * Number(item.purchasedQty || 1);
                        return <Link className="order-product-row" to={`/order_details/${order._id}`} key={`${order._id}-${item._id || index}`}>
                          <div className="order-product-image">{image ? <img className="orderImg" src={generatePublicUrl(image)} alt={product?.name || "Ordered product"} loading="lazy" /> : <span>Image unavailable</span>}</div>
                          <div className="order-product-main">
                            <h2>{product?.name || "Product no longer available"}</h2>
                            {(item.colorName || item.size) && <p>{[item.colorName, item.size].filter(Boolean).join(" · ")}</p>}
                            <span>Quantity: {item.purchasedQty || 1}</span>
                          </div>
                          <div className="order-product-price"><Price value={lineTotal} /><span>View order details <IoIosArrowForward /></span></div>
                        </Link>;
                      })}
                    </div>
                    <footer className="order-card-footer">
                      <span>{order.items?.length || 0} {(order.items?.length || 0) === 1 ? "item" : "items"} · Includes Rs. {Number(order.shippingFee || 0).toLocaleString("en-PK")} delivery</span>
                      <div><span>Order total</span><Price value={order.totalAmount ?? order.subtotal ?? 0} /></div>
                    </footer>
                  </Card>;
                })}
              </div>}
      </main>
    </Layout>
  );
};

export default OrderPage;
