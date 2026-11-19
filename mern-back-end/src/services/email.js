const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

const storefrontUrl = () => String(process.env.STOREFRONT_URL || "http://localhost:3000").replace(/\/$/, "");

exports.sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  if (!from) throw new Error("RESEND_FROM_EMAIL must be set to a verified sender address.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    let reason = "Resend rejected the email request.";
    try {
      const payload = await response.json();
      reason = payload.message || payload.name || reason;
    } catch { /* Keep a safe generic error if Resend did not return JSON. */ }
    throw new Error(`Resend request failed (${response.status}): ${reason}`);
  }
  return response.json();
};

exports.sendPasswordResetEmail = async (user, rawToken) => {
  const resetUrl = `${storefrontUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const name = escapeHtml(user.firstName || "there");
  return exports.sendEmail({
    to: user.email,
    subject: "Reset your Subazen password",
    text: `Hi ${user.firstName || "there"},\n\nUse this link to reset your Subazen password. It expires in 30 minutes:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;color:#172b45;max-width:560px;margin:auto;padding:28px"><h1 style="color:#1769e0">Reset your password</h1><p>Hi ${name},</p><p>We received a request to reset your Subazen password. This link expires in 30 minutes.</p><p style="margin:28px 0"><a href="${resetUrl}" style="background:#1769e0;border-radius:7px;color:#fff;padding:13px 20px;text-decoration:none;font-weight:bold">Reset password</a></p><p>If you did not request a reset, you can ignore this email.</p></div>`,
  });
};

exports.sendOrderStatusEmail = async (order, user, status) => {
  if (!user?.email) throw new Error("Order customer email is unavailable.");
  if (!["ordered", "shipped", "delivered"].includes(status)) return null;
  const orderId = String(order._id);
  const items = (order.items || []).map((item) => {
    const title = escapeHtml(item.productId?.name || "Product");
    const option = [item.colorName, item.size].filter(Boolean).map(escapeHtml).join(" / ");
    return `<tr><td style="padding:9px 0;border-bottom:1px solid #e9edf3">${title}${option ? `<br><small style="color:#697586">${option}</small>` : ""}</td><td style="padding:9px 0;border-bottom:1px solid #e9edf3;text-align:center">${Number(item.purchasedQty || 0)}</td><td style="padding:9px 0;border-bottom:1px solid #e9edf3;text-align:right">Rs. ${Number(item.payablePrice || 0).toLocaleString("en-PK")}</td></tr>`;
  }).join("");
  const delivered = status === "delivered";
  const customerFirstName = String(user.firstName || "there").trim();
  const safeCustomerFirstName = escapeHtml(customerFirstName);
  const stage = {
    ordered: {
      subject: `Thank you for your order, ${customerFirstName}`,
      eyebrow: "ORDER CONFIRMED",
      heading: "Thank you for placing your order!",
      message: `Hi ${safeCustomerFirstName}, thank you for choosing Subazen. We’ve received your Cash on Delivery order and our team is getting it ready. We’ll email you again when it’s on the way.`,
      closing: "We appreciate you shopping with Subazen. Your order details are below for easy reference.",
      accent: "#1769e0",
    },
    shipped: {
      subject: "Your Subazen order is on its way",
      eyebrow: "SHIPPING UPDATE",
      heading: "Your order is on its way",
      message: `Hi ${safeCustomerFirstName}, we’ve handed your order over for delivery. Please keep the Cash on Delivery total ready for the delivery person.`,
      closing: "You can check your order page for the latest delivery progress.",
      accent: "#087f8c",
    },
    delivered: {
      subject: "Delivered: how was your Subazen experience?",
      eyebrow: "DELIVERY COMPLETE",
      heading: "Your order has been delivered!",
      message: `Hi ${safeCustomerFirstName}, thank you for placing your order with Subazen. We hope everything arrived safely and that you’re happy with your purchase. How was your experience? We’d love to hear your feedback about each item.`,
      closing: "Thanks for being part of Subazen. Your feedback helps us improve and helps other shoppers choose with confidence.",
      accent: "#198754",
    },
  }[status];
  const feedbackItems = delivered ? (order.items || []).filter((item) => item.productId?.slug).map((item) => ({
    name: item.productId.name || "Product",
    url: `${storefrontUrl()}/products/${encodeURIComponent(item.productId.slug)}#product-reviews-title`,
  })) : [];
  const reviewLinks = feedbackItems.map((item) => `<li style="list-style:none;margin:12px 0"><a href="${item.url}" style="background:#1769e0;border-radius:6px;color:#fff;display:inline-block;font-weight:700;padding:10px 14px;text-decoration:none">Review ${escapeHtml(item.name)}</a></li>`).join("");
  const textLines = (order.items || []).map((item) => `${item.productId?.name || "Product"} x ${item.purchasedQty}`).join("\n");
  const feedbackText = feedbackItems.length
    ? `\n\nShare your feedback for each product:\n${feedbackItems.map((item) => `${item.name}: ${item.url}`).join("\n")}`
    : "";
  return exports.sendEmail({
    to: user.email,
    subject: `${stage.subject} · #${orderId.slice(-8)}`,
    text: `${stage.heading}\n\n${stage.message}\n\nOrder #${orderId.slice(-8)}\n\n${textLines}\n\nSubtotal: Rs. ${Number(order.subtotal || 0).toLocaleString("en-PK")}\nShipping: Rs. ${Number(order.shippingFee || 0).toLocaleString("en-PK")}\nTotal: Rs. ${Number(order.totalAmount || 0).toLocaleString("en-PK")} (Cash on Delivery)${feedbackText}\n\n${stage.closing}`,
    html: `<div style="background:#f4f7fb;padding:24px 12px"><div style="color:#172b45;font-family:Arial,sans-serif;margin:0 auto;max-width:600px"><div style="background:#fff;border:1px solid #e5ebf3;border-radius:12px;overflow:hidden"><div style="background:${stage.accent};height:5px"></div><div style="padding:26px clamp(18px,5vw,32px)"><div style="border-bottom:1px solid #edf1f6;padding-bottom:16px"><strong style="color:#1769e0;font-size:23px;letter-spacing:-.5px">Subazen</strong><span style="color:#718096;float:right;font-size:12px;padding-top:6px">PKR · Cash on Delivery</span></div><p style="color:${stage.accent};font-size:11px;font-weight:bold;letter-spacing:1.2px;margin:24px 0 7px">${stage.eyebrow}</p><h1 style="color:#172b45;font-size:24px;line-height:1.25;margin:0 0 12px">${stage.heading}</h1><p style="color:#536276;font-size:15px;line-height:1.65;margin:0">${stage.message}</p><div style="background:#f5f8fc;border:1px solid #e8eef5;border-radius:8px;margin:20px 0 18px;padding:14px"><span style="color:#718096;font-size:12px">ORDER REFERENCE</span><br><strong style="color:#24364e;font-size:15px">#${escapeHtml(orderId.slice(-8).toUpperCase())}</strong></div><h2 style="color:#24364e;font-size:16px;margin:22px 0 8px">${delivered ? "Your delivered items" : "Order summary"}</h2><table style="border-collapse:collapse;width:100%"><thead><tr><th style="color:#718096;font-size:12px;padding:8px 0;text-align:left">Item</th><th style="color:#718096;font-size:12px;padding:8px 0;text-align:center">Qty</th><th style="color:#718096;font-size:12px;padding:8px 0;text-align:right">Price</th></tr></thead><tbody>${items}</tbody></table><table style="border-collapse:collapse;margin-top:12px;width:100%"><tbody><tr><td style="color:#68788d;font-size:13px;padding:4px 0">Subtotal</td><td style="color:#24364e;font-size:13px;padding:4px 0;text-align:right">Rs. ${Number(order.subtotal || 0).toLocaleString("en-PK")}</td></tr><tr><td style="color:#68788d;font-size:13px;padding:4px 0">Shipping</td><td style="color:#24364e;font-size:13px;padding:4px 0;text-align:right">Rs. ${Number(order.shippingFee || 0).toLocaleString("en-PK")}</td></tr><tr><td style="border-top:1px solid #e7edf4;color:#172b45;font-size:14px;font-weight:bold;padding:10px 0 0">Total to pay on delivery</td><td style="border-top:1px solid #e7edf4;color:#172b45;font-size:14px;font-weight:bold;padding:10px 0 0;text-align:right">Rs. ${Number(order.totalAmount || 0).toLocaleString("en-PK")}</td></tr></tbody></table>${delivered ? `<div style="background:#eff7ff;border:1px solid #dcecff;border-radius:9px;margin-top:24px;padding:16px"><strong style="color:#24364e;font-size:15px">How was your experience?</strong><p style="color:#536276;font-size:13px;line-height:1.55;margin:7px 0 12px">We’d be grateful if you shared a little feedback about the products you received.</p>${reviewLinks ? `<ul style="margin:0;padding:0">${reviewLinks}</ul>` : "<p style=\"color:#536276;font-size:13px\">Visit your order page to view the items and share feedback.</p>"}</div>` : ""}<p style="color:#718096;font-size:13px;line-height:1.55;margin:24px 0 0">${stage.closing}</p></div></div><p style="color:#91a0b2;font-size:11px;line-height:1.5;margin:14px auto 0;max-width:540px;text-align:center">You’re receiving this email because an order was placed using your Subazen account.</p></div></div>`,
  });
};
