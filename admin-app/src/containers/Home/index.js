import React, { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Badge, Button, Card, Col, Container, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FaArrowRight, FaBoxes, FaChartLine, FaClipboardList, FaExclamationTriangle, FaLayerGroup, FaPlus, FaStore, FaTruck } from "react-icons/fa";
import { getCustomerOrders } from "../../actions";
import Layout from "../../components/Layout";
import "./style.css";

const flattenCategories = (categories = []) => categories.flatMap((category) => [category, ...flattenCategories(category.children || [])]);
const getStock = (product) => {
  if (!product.colors?.length) return Number(product.quantity || 0);
  return product.colors.reduce((total, color) => total + (color.sizes?.length
    ? color.sizes.reduce((sizeTotal, size) => sizeTotal + Number(size.quantity || 0), 0)
    : Number(color.quantity ?? product.quantity ?? 0)), 0);
};
const formatDate = (value) => new Date(value).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
const dateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function OrdersChart({ orders, loading }) {
  const points = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      return {
        day,
        label: day.toLocaleDateString("en-PK", { weekday: "short" }),
        count: orders.filter((order) => dateKey(new Date(order.createdAt)) === dateKey(day)).length,
      };
    });
  }, [orders]);
  const max = Math.max(4, ...points.map((point) => point.count));
  const width = 720;
  const height = 250;
  const chartTop = 24;
  const chartBottom = 188;
  const step = width / points.length;
  const barWidth = Math.min(42, step * 0.38);
  return <div className="overview-chart-wrap">
    <svg className="overview-orders-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Orders placed per day over the last seven days">
      <defs>
        <linearGradient id="ordersBarGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#68b7ff" /><stop offset="1" stopColor="#1769e0" /></linearGradient>
        <linearGradient id="ordersSideGradient" x1="0" x2="1"><stop offset="0" stopColor="#1554b2" /><stop offset="1" stopColor="#0d3d8d" /></linearGradient>
      </defs>
      {[0, 1, 2, 3].map((line) => {
        const y = chartBottom - ((chartBottom - chartTop) / 3) * line;
        return <g key={line}><line x1="34" x2="704" y1={y} y2={y} stroke="#e8eef7" strokeDasharray={line === 0 ? "0" : "4 6"} /><text x="4" y={y + 4} fill="#8c9ab0" fontSize="11">{Math.round((max / 3) * line)}</text></g>;
      })}
      {points.map((point, index) => {
        const x = 48 + index * step + (step - barWidth) / 2;
        const barHeight = point.count ? Math.max(5, (point.count / max) * (chartBottom - chartTop)) : 3;
        const y = chartBottom - barHeight;
        return <g key={point.day.toISOString()} className="overview-chart-bar">
          <polygon points={`${x},${y} ${x + 8},${y - 7} ${x + barWidth + 8},${y - 7} ${x + barWidth},${y}`} fill="#8ecaff" />
          <polygon points={`${x + barWidth},${y} ${x + barWidth + 8},${y - 7} ${x + barWidth + 8},${chartBottom - 7} ${x + barWidth},${chartBottom}`} fill="url(#ordersSideGradient)" />
          <rect x={x} y={y} width={barWidth} height={barHeight} rx="7" fill="url(#ordersBarGradient)" />
          {point.count > 0 && <text x={x + barWidth / 2} y={y - 12} textAnchor="middle" fill="#34445d" fontSize="12" fontWeight="700">{point.count}</text>}
          <text x={x + barWidth / 2} y="220" textAnchor="middle" fill="#77869d" fontSize="12">{point.label}</text>
        </g>;
      })}
    </svg>
    {loading && <div className="overview-chart-loading">Updating order activity…</div>}
  </div>;
}

function CategoryChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const colors = ["#2878f0", "#23b8a5", "#ff914d", "#7b68ee", "#59a8e8"];
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <div className="overview-category-chart">
    <div className="overview-donut-wrap">
      <svg viewBox="0 0 160 160" role="img" aria-label="Active products by category">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#edf2f8" strokeWidth="18" />
        {total > 0 && items.map((item, index) => {
          const length = (item.count / total) * circumference;
          const circle = <circle key={item.name} cx="80" cy="80" r={radius} fill="none" stroke={colors[index % colors.length]} strokeWidth="18" strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)" />;
          offset += length;
          return circle;
        })}
        <text x="80" y="77" textAnchor="middle" className="overview-donut-total">{total}</text>
        <text x="80" y="98" textAnchor="middle" className="overview-donut-caption">products</text>
      </svg>
    </div>
    <div className="overview-category-legend">{items.length ? items.map((item, index) => <div className="overview-legend-row" key={item.name}><i style={{ backgroundColor: colors[index % colors.length] }} /><span>{item.name}</span><strong>{item.count}</strong></div>) : <p className="overview-muted">No active products yet.</p>}</div>
  </div>;
}

export default function Home() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const productsState = useSelector((state) => state.product);
  const categoryState = useSelector((state) => state.category);
  const orderState = useSelector((state) => state.order || { orders: [], loading: false, error: null });
  const requestedOrders = useRef(false);
  const isAdmin = auth.user?.role === "admin";
  const products = (productsState.products || []).filter((product) => product.isActive !== false);
  const categories = flattenCategories(categoryState.categories || []);
  const orders = orderState.orders || [];
  const deliveredOrders = orders.filter((order) => order.orderStatus?.some((status) => status.type === "delivered" && status.isCompleted));
  const newOrders = orders.filter((order) => !order.orderStatus?.some((status) => status.type === "delivered" && status.isCompleted));
  const lowStock = products.map((product) => ({ product, stock: getStock(product) })).filter(({ stock }) => stock <= 5).sort((left, right) => left.stock - right.stock).slice(0, 5);
  const categoryDistribution = useMemo(() => {
    const categoryNames = new Map(categories.map((category) => [String(category._id), category.name]));
    const counts = new Map();
    products.forEach((product) => {
      const id = String(product.category?._id || product.category || "uncategorized");
      const name = categoryNames.get(id) || product.category?.name || "Uncategorized";
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const all = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    if (all.length <= 5) return all;
    return [...all.slice(0, 4), { name: "Other categories", count: all.slice(4).reduce((sum, item) => sum + item.count, 0) }];
  }, [categories, products]);

  useEffect(() => {
    if (isAdmin && !requestedOrders.current) {
      requestedOrders.current = true;
      dispatch(getCustomerOrders());
    }
  }, [dispatch, isAdmin]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = auth.user?.firstName || "there";
  const metrics = [
    { label: "Active products", value: products.length, icon: <FaBoxes />, tone: "blue", note: "Live in your catalog" },
    { label: "Categories", value: categories.length, icon: <FaLayerGroup />, tone: "mint", note: "Store navigation" },
    ...(isAdmin ? [
      { label: "To fulfill", value: newOrders.length, icon: <FaTruck />, tone: "orange", note: "Orders not delivered" },
      { label: "Delivered", value: deliveredOrders.length, icon: <FaClipboardList />, tone: "violet", note: "Completed deliveries" },
    ] : [{ label: "Needs restock", value: lowStock.length, icon: <FaExclamationTriangle />, tone: "orange", note: "Five units or fewer" }]),
  ];

  return <Layout sidebar>
    <Container fluid className="overview-page">
      <header className="overview-hero">
        <div className="overview-hero-copy">
          <span className="overview-eyebrow"><FaStore /> STORE CONTROL CENTER</span>
          <h1>{greeting}, {firstName}</h1>
          <p>Your Subazen store at a glance. Catalog and order figures come from your live store data.</p>
        </div>
        <div className="overview-hero-actions">
          <span className="overview-date">{new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}</span>
          <Button as={Link} to="/products" className="overview-primary-action"><FaPlus /> Add product</Button>
        </div>
        <div className="overview-hero-orb overview-hero-orb-one" /><div className="overview-hero-orb overview-hero-orb-two" />
      </header>

      {productsState.error && <Alert variant="danger" className="mt-3">{productsState.error}</Alert>}
      <Row className="g-3 overview-metrics">
        {metrics.map((metric) => <Col xs={12} sm={6} xl={3} key={metric.label}>
          <Card className={`overview-metric-card ${metric.tone}`}>
            <Card.Body><div className="overview-metric-top"><span>{metric.label}</span><i>{metric.icon}</i></div><div className="overview-metric-value">{metric.value.toLocaleString("en-PK")}</div><div className="overview-metric-note">{metric.note}</div></Card.Body>
          </Card>
        </Col>)}
      </Row>

      <Row className="g-3 overview-chart-row">
        {isAdmin && <Col xs={12} xl={7}><Card className="overview-panel h-100"><Card.Body>
          <div className="overview-panel-heading"><div><span className="overview-panel-kicker">ORDER ACTIVITY</span><h2>Orders placed</h2><p>Daily order count for the last seven days</p></div><span className="overview-panel-icon"><FaChartLine /></span></div>
          {orderState.error ? <div className="overview-chart-empty">Order activity is temporarily unavailable.</div> : <OrdersChart orders={orders} loading={orderState.loading} />}
        </Card.Body></Card></Col>}
        <Col xs={12} xl={isAdmin ? 5 : 12}><Card className="overview-panel h-100"><Card.Body>
          <div className="overview-panel-heading"><div><span className="overview-panel-kicker">CATALOG MIX</span><h2>Products by category</h2><p>Distribution of active catalog items</p></div><span className="overview-panel-icon mint"><FaLayerGroup /></span></div>
          <CategoryChart items={categoryDistribution} />
        </Card.Body></Card></Col>
      </Row>

      <Row className="g-3 overview-bottom-row">
        {isAdmin && <Col xs={12} xl={7}><Card className="overview-panel h-100"><Card.Body>
          <div className="overview-panel-heading"><div><span className="overview-panel-kicker">LATEST ACTIVITY</span><h2>Recent orders</h2><p>Newest customer orders first</p></div><Button as={Link} to="/orders" variant="link" className="overview-see-all">All orders <FaArrowRight /></Button></div>
          {orders.length ? <div className="overview-recent-orders">{orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5).map((order) => {
            const delivered = order.orderStatus?.some((status) => status.type === "delivered" && status.isCompleted);
            const name = order.user ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim() : "Customer";
            return <div className="overview-recent-order" key={order._id}><div className="overview-order-avatar">{name[0] || "C"}</div><div className="overview-order-main"><strong>{name}</strong><span>#{String(order._id).slice(-8)} · {formatDate(order.createdAt)}{order.addressSnapshot?.city ? ` · ${order.addressSnapshot.city}` : ""}</span></div><strong className="overview-order-total">Rs. {Number(order.totalAmount || 0).toLocaleString("en-PK")}</strong><Badge bg={delivered ? "success" : "primary"}>{delivered ? "Delivered" : "To fulfill"}</Badge></div>;
          })}</div> : <div className="overview-chart-empty">No customer orders yet.</div>}
        </Card.Body></Card></Col>}
        <Col xs={12} xl={isAdmin ? 5 : 12}><Card className="overview-panel h-100"><Card.Body>
          <div className="overview-panel-heading"><div><span className="overview-panel-kicker">INVENTORY WATCH</span><h2>Needs attention</h2><p>Products with five units or fewer</p></div><span className="overview-panel-icon orange"><FaExclamationTriangle /></span></div>
          {lowStock.length ? <div className="overview-stock-list">{lowStock.map(({ product, stock }) => <div className="overview-stock-item" key={product._id}><div className="overview-stock-product"><strong>{product.name}</strong><span>{product.brand || "No brand"}</span></div><span className={`overview-stock-count ${stock === 0 ? "empty" : ""}`}>{stock === 0 ? "Out of stock" : `${stock} left`}</span></div>)}</div> : <div className="overview-good-state">Inventory looks healthy. No products are at the five-unit threshold.</div>}
          <Link className="overview-text-link" to="/products">Manage products <FaArrowRight /></Link>
        </Card.Body></Card></Col>}
      </Row>

      <section className="overview-quick-actions"><div><span className="overview-panel-kicker">SHORTCUTS</span><h2>Keep the store moving</h2></div><div className="overview-shortcut-grid">
        <Link to="/products"><i><FaBoxes /></i><span><strong>Products</strong><small>Manage your catalog</small></span><FaArrowRight /></Link>
        <Link to="/category"><i><FaLayerGroup /></i><span><strong>Categories</strong><small>Organize store navigation</small></span><FaArrowRight /></Link>
        {isAdmin && <Link to="/orders"><i><FaClipboardList /></i><span><strong>Orders</strong><small>Review and fulfill orders</small></span><FaArrowRight /></Link>}
        {isAdmin && <Link to="/homepage"><i><FaStore /></i><span><strong>Homepage</strong><small>Update storefront sections</small></span><FaArrowRight /></Link>}
      </div></section>
    </Container>
  </Layout>;
}
