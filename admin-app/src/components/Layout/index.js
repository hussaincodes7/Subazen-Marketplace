import React from "react";
import Header from "../header";
import { Container } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaBoxes, FaClipboardList, FaHome, FaLayerGroup, FaRegFileAlt, FaTruck, FaColumns, FaAddressBook, FaStar, FaTags, FaEnvelopeOpenText, FaChartLine, FaDatabase } from "react-icons/fa";
import { generatePublicUrl } from "../../urlConfig";
import "./style.css";

/**
 * @author
 * @function Layout
 **/

const Layout = (props) => {
  const user = useSelector((state) => state.auth.user);
  return (
    <>
      <Header />
      {props.sidebar ? (
        <Container fluid className="admin-layout">
          <div className="admin-layout-row">
            <aside className="sidebar">
              <div className="sidebar-brand">
                <img src={generatePublicUrl("subazen-marketplace-logo.png")} alt="Subazen Online Marketplace" />
              </div>
              <div className="sidebar-section-label">WORKSPACE</div>
              <ul>
                <li>
                  <NavLink exact to={`/`}><FaHome aria-hidden="true" /><span>Overview</span></NavLink>
                </li>
                <li>
                  <NavLink to={`/category`}><FaLayerGroup aria-hidden="true" /><span>Categories</span></NavLink>
                </li>
                {user?.role === "admin" && <li><NavLink to={`/brands`}><FaTags aria-hidden="true" /><span>Brands</span></NavLink></li>}
                <li>
                  <NavLink to={`/pages`}><FaRegFileAlt aria-hidden="true" /><span>Pages</span></NavLink>
                </li>
                <li>
                  <NavLink to={`/products`}><FaBoxes aria-hidden="true" /><span>Products</span></NavLink>
                </li>
                {user?.role === "admin" && <li><NavLink to={`/orders`}><FaClipboardList aria-hidden="true" /><span>Orders</span></NavLink></li>}
                {user?.role === "admin" && <li><NavLink to={`/shipping`}><FaTruck aria-hidden="true" /><span>Shipping</span></NavLink></li>}
                {user?.role === "admin" && <li><NavLink to={`/homepage`}><FaColumns aria-hidden="true" /><span>Homepage</span></NavLink></li>}
                {user?.role === "admin" && <li><NavLink to={`/footer`}><FaAddressBook aria-hidden="true" /><span>Footer</span></NavLink></li>}
                {user?.role === "admin" && <li><NavLink to={`/tracking`}><FaChartLine aria-hidden="true" /><span>Google tracking</span></NavLink></li>}
                {user?.role === "admin" && <li><NavLink to={`/database-backups`}><FaDatabase aria-hidden="true" /><span>Database backups</span></NavLink></li>}
                {user?.role === "admin" && <li><NavLink to={`/reviews`}><FaStar aria-hidden="true" /><span>Reviews</span></NavLink></li>}
                {user?.role === "admin" && <li><NavLink to={`/contact-messages`}><FaEnvelopeOpenText aria-hidden="true" /><span>Contact messages</span></NavLink></li>}
              </ul>
              <div className="sidebar-account">
                <span className="sidebar-account-avatar">{user?.firstName?.[0] || "A"}</span>
                <span><strong>{user?.firstName || "Admin"}</strong><small>{user?.role === "admin" ? "Full Admin" : "Junior Admin"}</small></span>
              </div>
            </aside>
            <main className="admin-main">
              {props.children}
            </main>
          </div>
        </Container>
      ) : (
        props.children
      )}
    </>
  );
};
export default Layout;
