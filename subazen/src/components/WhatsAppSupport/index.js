import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaWhatsapp } from "react-icons/fa";
import axios from "../../helpers/axios";
import "./style.css";

const fallbackTemplates = [
  { label: "Ask about a product", message: "Hi Subazen Support, I’d like to know more about this product: " },
  { label: "Return or refund help", message: "Hi Subazen Support, I need help with a return or refund. My order number is: " },
  { label: "Request a custom quote", message: "Hi Subazen Support, I’d like a custom quote for this product: " },
  { label: "Other question", message: "Hi Subazen Support, I have a question: " },
];

export default function WhatsAppSupport() {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("+923064652044");
  const [templates, setTemplates] = useState(fallbackTemplates);

  useEffect(() => {
    let active = true;
    axios.get("/footer").then(({ data }) => {
      if (!active) return;
      const settings = data?.settings || {};
      if (settings.whatsappNumber) setNumber(settings.whatsappNumber);
      if (Array.isArray(settings.whatsappTemplates) && settings.whatsappTemplates.length) setTemplates(settings.whatsappTemplates);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const openWhatsApp = (message = "Hi Subazen Support, I need help.") => {
    const phone = String(number).replace(/\D/g, "");
    if (!phone) return;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return createPortal(<div className="whatsapp-support">
    {open && <section className="whatsapp-support-panel" aria-label="WhatsApp customer support">
      <header className="whatsapp-support-header"><span className="whatsapp-support-mark"><FaWhatsapp aria-hidden="true" /></span><div><strong>Subazen Support</strong><small>We’re here to help</small></div><button type="button" aria-label="Close support menu" onClick={() => setOpen(false)}>×</button></header>
      <div className="whatsapp-support-body"><p>Hi there! What can we help you with?</p>
        {templates.map((template, index) => <button type="button" key={`${template.label}-${index}`} onClick={() => openWhatsApp(template.message)}>{template.label}<span aria-hidden="true">›</span></button>)}
      </div>
      <div className="whatsapp-support-footer">Opens a chat with our customer support</div>
    </section>}
    <button className="whatsapp-support-launcher" type="button" aria-label={open ? "Close WhatsApp support" : "Chat with Subazen support on WhatsApp"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {open ? <span className="whatsapp-support-close">×</span> : <FaWhatsapp aria-hidden="true" />}
      {!open && <span className="whatsapp-support-label">Chat with us</span>}
    </button>
  </div>, document.body);
}
