import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Switch, useLocation } from "react-router-dom";
import HomePage from "./containers/HomePage";
import ProductListPage from "./containers/ProductListPage";
import { useDispatch, useSelector } from "react-redux";
import { isUserLoggedIn, updateCart, signout, getTokenExpiration } from "./actions";
import ProductDetailsPage from "./containers/ProductDetailsPage";
import CartPage from "./containers/CartPage";
import CheckoutPage from "./containers/CheckoutPage";
import OrderPage from "./containers/OrderPage";
import OrderDetailsPage from "./containers/OrderDetailsPage";
import SearchPage from "./containers/SearchPage";
import PolicyPage from "./containers/PolicyPage";
import ResetPassword from "./containers/ResetPassword";
import CategoryBrowsePage from "./containers/CategoryBrowsePage";
import ContactPage from "./containers/ContactPage";
import axios from "./helpers/axios";
import WhatsAppSupport from "./components/WhatsAppSupport";

const routeMatchesTrackingPage = (page, pathname) => {
  const path = pathname.replace(/\/+$/, "") || "/";
  const knownStatic = new Set(["/", "/cart", "/checkout", "/search", "/contact", "/account/orders"]);
  if (page === "all") return true;
  if (page === "home") return path === "/";
  if (page === "cart") return path === "/cart";
  if (page === "checkout") return path === "/checkout";
  if (page === "search") return path === "/search";
  if (page === "contact") return path === "/contact";
  if (page === "product") return path.startsWith("/products/") || /\/p$/.test(path);
  if (page === "category") return path.startsWith("/collections/") || (!knownStatic.has(path) && !path.startsWith("/products/") && !path.startsWith("/pages/") && !/\/p$/.test(path) && !/^\/order_details\//.test(path));
  if (page === "account") return path.startsWith("/account/") || path.startsWith("/order_details/");
  if (page === "policy") return path.startsWith("/pages/");
  if (page === "custom") return false;
  return false;
};

function TrackingScripts() {
  const location = useLocation();
  const [scripts, setScripts] = useState([]);
  useEffect(() => {
    let active = true;
    axios.get("/tracking").then((response) => { if (active) setScripts(response.data?.scripts || []); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!scripts.length) return;
    const activeScripts = scripts.filter((item) => (item.pages || ["all"]).some((page) => page === "custom" ? (location.pathname.replace(/\/+$/, "") || "/") === String(item.customPath || "") : routeMatchesTrackingPage(page, location.pathname)));
    const activeIds = new Set(activeScripts.map((item, index) => String(item._id || `${item.provider}-${index}`)));
    const nodeMap = window.__subazenTrackingNodes || (window.__subazenTrackingNodes = new Map());
    nodeMap.forEach((nodes, id) => {
      if (!activeIds.has(id)) {
        nodes.forEach((node) => node.remove());
        nodeMap.delete(id);
      }
    });
    activeScripts.forEach((item, index) => {
      const id = String(item._id || `${item.provider}-${index}`);
      if (nodeMap.has(id)) return;
      const parsed = new DOMParser().parseFromString(`<body>${item.code || ""}</body>`, "text/html");
      const createdNodes = [];
      parsed.body.querySelectorAll("script").forEach((source) => {
        const script = document.createElement("script");
        Array.from(source.attributes).forEach((attribute) => script.setAttribute(attribute.name, attribute.value));
        script.dataset.subazenTrackingId = id;
        script.textContent = source.textContent || "";
        (item.placement === "body" ? document.body : document.head).appendChild(script);
        createdNodes.push(script);
      });
      parsed.body.querySelectorAll("iframe").forEach((source) => {
        const frame = document.createElement("iframe");
        Array.from(source.attributes).forEach((attribute) => frame.setAttribute(attribute.name, attribute.value));
        frame.dataset.subazenTrackingId = id;
        (item.placement === "body" ? document.body : document.head).appendChild(frame);
        createdNodes.push(frame);
      });
      if (createdNodes.length) nodeMap.set(id, createdNodes);
    });
  }, [location.pathname, scripts]);
  return null;
}

function App() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);

  useEffect(() => {
    if (!auth.authenticate) {
      dispatch(isUserLoggedIn());
    }
  }, [auth.authenticate, dispatch]);

  useEffect(() => {
    console.log("App.js - updateCart");
    dispatch(updateCart());
  }, [auth.authenticate, dispatch]);

  useEffect(() => {
    if (!auth.authenticate || !auth.token) return undefined;
    const expiresAt = getTokenExpiration(auth.token);
    if (!expiresAt || expiresAt <= Date.now()) {
      dispatch(signout());
      return undefined;
    }
    const timeout = window.setTimeout(() => dispatch(signout()), Math.min(expiresAt - Date.now(), 2147483647));
    return () => window.clearTimeout(timeout);
  }, [auth.authenticate, auth.token, dispatch]);

  return (
    <div className="App">
      <Router>
        <Switch>
          <Route path="/" exact component={HomePage} />
          <Route path="/cart" component={CartPage} />
          <Route path="/checkout" component={CheckoutPage} />
          <Route path="/account/orders" component={OrderPage} />
          <Route path="/order_details/:orderId" component={OrderDetailsPage} />
          <Route path="/search" component={SearchPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/pages/:slug" component={PolicyPage} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/products/:productSlug" component={ProductDetailsPage} />
          {/* React Router v5 requires a named splat to match nested category paths. */}
          <Route path="/collections/:path*" component={CategoryBrowsePage} />
          <Route
            path="/:productSlug/:productId/p"
            component={ProductDetailsPage}
          />
          <Route path="/:slug" component={ProductListPage} />
        </Switch>
        <TrackingScripts />
        <WhatsAppSupport />
      </Router>
    </div>
  );
}

export default App;
