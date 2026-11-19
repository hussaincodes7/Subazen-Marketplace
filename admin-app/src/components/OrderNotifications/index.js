import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Dropdown } from "react-bootstrap";
import { FaBell, FaClipboardList } from "react-icons/fa";
import { useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "../../helpers/axios";
import "./style.css";

const getKey = (user) => `subazen-admin-order-alerts:${user?._id || user?.id || user?.email || "admin"}`;
const readSaved = (key) => {
  try { return JSON.parse(window.localStorage.getItem(key) || "{}"); } catch { return {}; }
};

export default function OrderNotifications() {
  const user = useSelector((state) => state.auth.user);
  const history = useHistory();
  const key = useMemo(() => getKey(user), [user]);
  const [notifications, setNotifications] = useState([]);
  const inFlight = useRef(false);

  const pollOrders = useCallback(async () => {
    if (inFlight.current || document.visibilityState === "hidden") return;
    inFlight.current = true;
    try {
      const response = await axios.post("/admin/order/getCustomerOrders");
      const orders = response.data?.orders || [];
      const saved = readSaved(key);
      const currentIds = orders.map((order) => String(order._id || "")).filter(Boolean);
      const knownIds = new Set(saved.knownIds || []);
      const fresh = saved.initialized ? orders.filter((order) => order._id && !knownIds.has(String(order._id))).map((order) => {
        const name = order.user ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim() : "Customer";
        return { id: String(order._id), label: `New order #${String(order._id).slice(-8)}`, detail: name, createdAt: order.createdAt || new Date().toISOString(), read: false };
      }) : [];
      const nextNotifications = [...fresh, ...(saved.notifications || [])].slice(0, 30);
      const next = { initialized: true, knownIds: [...new Set([...knownIds, ...currentIds])].slice(-10000), notifications: nextNotifications };
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep current-session alerts even if storage is unavailable. */ }
      setNotifications(nextNotifications);
    } catch {
      // Keep the existing bell state when the API is briefly unavailable.
    } finally {
      inFlight.current = false;
    }
  }, [key]);

  useEffect(() => {
    setNotifications(readSaved(key).notifications || []);
    pollOrders();
    const timer = window.setInterval(pollOrders, 60000);
    const refresh = () => { if (document.visibilityState === "visible") pollOrders(); };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", pollOrders);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", pollOrders);
    };
  }, [key, pollOrders]);

  const save = (nextNotifications) => {
    setNotifications(nextNotifications);
    const saved = readSaved(key);
    try { window.localStorage.setItem(key, JSON.stringify({ ...saved, notifications: nextNotifications })); } catch { /* Session state remains usable if storage is unavailable. */ }
  };
  const unread = notifications.filter((notification) => !notification.read).length;

  return <Dropdown align="end" className="admin-order-notifications">
    <Dropdown.Toggle as="button" type="button" className="admin-order-notifications-toggle" aria-label={`Order notifications${unread ? `, ${unread} unread` : ""}`}>
      <FaBell aria-hidden="true" />
      {unread > 0 && <Badge bg="danger" pill>{unread > 9 ? "9+" : unread}</Badge>}
    </Dropdown.Toggle>
    <Dropdown.Menu className="admin-order-notifications-menu">
      <div className="admin-order-notifications-heading"><div><strong>New orders</strong><span>{unread ? `${unread} unread` : "You're all caught up"}</span></div><Button variant="link" size="sm" disabled={!notifications.length} onClick={() => save([])}>Mark all read</Button></div>
      <div className="admin-order-notifications-list">{notifications.length ? notifications.slice(0, 10).map((notification) => <button type="button" className={`admin-order-notification ${notification.read ? "is-read" : "is-unread"}`} key={notification.id} onClick={() => { save(notifications.map((item) => item.id === notification.id ? { ...item, read: true } : item)); history.push("/orders"); }}>
        <span className="admin-order-notification-icon"><FaClipboardList aria-hidden="true" /></span><span className="admin-order-notification-copy"><strong>{notification.label}</strong><span>{notification.detail}</span><small>{new Date(notification.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}</small></span><i aria-hidden="true" />
      </button>) : <div className="admin-order-notifications-empty">New customer orders will appear here.</div>}</div>
      <Dropdown.Item as="button" className="admin-order-notifications-refresh" onClick={pollOrders}>Refresh orders</Dropdown.Item>
    </Dropdown.Menu>
  </Dropdown>;
}
