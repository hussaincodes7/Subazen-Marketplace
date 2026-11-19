import React, { useEffect, useState } from "react";
import logo from "../../Images/subazen.png";
import axios from "../../helpers/axios";
import { storeInformationPages } from "../../content/storeInformationPages";
import "./style.css";

const fallback = {
  brandName: "Subazen",
  description: "Shop online with Subazen in Pakistan.",
  email: "hafizahsanashfaq17@gmail.com",
  phone: "0300000000",
  address: "Karim Park, Lahore, Pakistan",
  columns: [
    { title: "Shop", links: [{ label: "Browse products", url: "/" }, { label: "Search", url: "/search" }, { label: "Shopping cart", url: "/cart" }] },
    { title: "Your account", links: [{ label: "My orders", url: "/account/orders" }, { label: "Checkout", url: "/checkout" }] },
    { title: "Customer support", links: [{ label: "Contact Us", url: "/contact" }] },
  ],
  socialLinks: [],
  pages: storeInformationPages,
  orderingNote: "Cash on Delivery is the available payment method. Shipping charges are shown before you place an order.",
  copyrightText: "Subazen",
};

export default function Footer() {
  const [settings, setSettings] = useState(fallback);
  useEffect(() => {
    let current = true;
    axios.get("/footer")
      .then((response) => { if (current && response.data?.settings) {
        const remote = response.data.settings;
        const pages = storeInformationPages.map((defaultPage) => ({ ...defaultPage, ...(remote.pages || []).find((page) => page.slug === defaultPage.slug) }));
        setSettings({ ...fallback, ...remote, pages });
      } })
      .catch(() => { /* Keep usable default footer content if settings are temporarily unavailable. */ });
    return () => { current = false; };
  }, []);

  const hasContactPageLink = (settings.columns || []).some((column) => (column.links || []).some((link) => link.url === "/contact" || link.label.toLowerCase() === "contact us"));

  return <footer className="store-footer">
    <div className="store-footer-inner">
      <div className="store-footer-brand">
        <a href="/" aria-label={`${settings.brandName} home`}><img src={logo} alt={settings.brandName} /></a>
        {settings.description && <p>{settings.description}</p>}
      </div>
      {(settings.columns || []).map((column, index) => <nav aria-label={`${column.title} footer links`} key={column._id || `${column.title}-${index}`}>
        <h2>{column.title}</h2>
        {(column.links || []).map((link, linkIndex) => <a key={link._id || `${link.label}-${linkIndex}`} href={link.url}>{link.label}</a>)}
      </nav>)}
      {!hasContactPageLink && <nav aria-label="Customer support footer links"><h2>Customer support</h2><a href="/contact">Contact Us</a></nav>}
      {!!(settings.pages || []).length && <nav aria-label="Store information pages"><h2>Information</h2>{settings.pages.map((page) => <a key={page.slug} href={`/pages/${page.slug}`}>{page.title}</a>)}</nav>}
      <div className="store-footer-contact">
        <h2>Contact us</h2>
        {settings.address && <p>{settings.address}</p>}
        {settings.email && <p>Mail us: <a href={`mailto:${settings.email}`}>{settings.email}</a></p>}
        {settings.phone && <p>Call us: <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>{settings.phone}</a></p>}
        {(settings.socialLinks || []).length > 0 && <div className="store-footer-social">{settings.socialLinks.map((link, index) => <a key={link._id || `${link.label}-${index}`} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div>}
      </div>
      {settings.orderingNote && <div className="store-footer-info"><h2>Ordering</h2><p>{settings.orderingNote}</p></div>}
    </div>
    <div className="store-footer-bottom"><span>© {new Date().getFullYear()} {settings.copyrightText || settings.brandName}</span><span>Prices shown in Pakistani Rupees (PKR).</span></div>
  </footer>;
}
