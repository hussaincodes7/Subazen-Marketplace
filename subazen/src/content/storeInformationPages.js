export const storeInformationPages = [
  {
    slug: "about-us",
    title: "About Us",
    content: "Subazen is an online marketplace serving customers in Pakistan. Our store is based in Karim Park, Lahore. Browse the current product catalogue for available items, descriptions and prices.\n\nOrders are placed through our website and are currently paid by Cash on Delivery. Any shipping charges are shown before you submit an order. For questions about a product or an existing order, use the Contact Us page or email hafizahsanashfaq17@gmail.com.\n\nStore information: Privacy Policy, Returns and Refunds, and DMCA. These pages and our contact details are available from the website footer.",
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    content: "Subazen receives information you provide when placing an order or contacting support. This can include your name, phone number, email address, delivery address, order details and the contents of your message.\n\nWe use this information to process and deliver orders, share order updates, respond to enquiries, maintain account and order records, and protect the website from misuse. Checkout currently offers Cash on Delivery; do not send payment card details through the contact form.\n\nThe website may use browser storage needed for cart, sign-in and site preferences. Analytics or optional cookies are used only if enabled on the site. Information is kept for as long as it is needed to handle orders, support requests and related business records.\n\nTo ask about, correct or request removal of personal information, email hafizahsanashfaq17@gmail.com with the subject Privacy Request. We may need to retain information connected to an order or an unresolved support matter.\n\nRelated information: About Us, Returns and Refunds, DMCA. Contact Us is available in the footer.",
  },
  {
    slug: "return-policy",
    title: "Returns and Refunds",
    content: "If an order arrives damaged, incorrect or incomplete, contact Subazen support as soon as possible. Include your order number, the product name, a description of the issue and clear photos when they help explain the problem.\n\nReturn eligibility can depend on the product and its condition. Check any product-specific return information shown on the product page or order communications. Support will review the details and explain the available next steps.\n\nWhere a return, replacement or refund is approved, our team will confirm the arrangement directly with you. For Cash on Delivery orders, contact support before sending an item back so the return and any refund arrangement can be coordinated. Do not ship an item until support has provided instructions.\n\nFor help with a return, use Contact Us or email hafizahsanashfaq17@gmail.com and include your order number. Related information: About Us, Privacy Policy, DMCA.",
  },
  {
    slug: "dmca",
    title: "DMCA",
    content: "Subazen respects intellectual property rights and reviews reports about material on this website. If you believe content available through Subazen uses work you own or are authorized to represent without permission, email hafizahsanashfaq17@gmail.com with the subject Copyright Report.\n\nPlease include your name and contact details, a description of the work, the exact page or product URL, an explanation of your relationship to the rights holder, and any information that helps us review the report. Send only information you are comfortable sharing with the store team.\n\nWe will review the report and may contact you for clarification. Where appropriate, we may restrict or remove the reported material while it is reviewed. If you believe content was reported or restricted by mistake, reply to the case email with the relevant URL and an explanation.\n\nRelated information: About Us, Privacy Policy, Returns and Refunds. Contact Us is available in the footer. This page describes Subazen’s contact process and does not make a legal determination about any report.",
  },
];

export const getStoreInformationPage = (slug) => storeInformationPages.find((page) => page.slug === slug) || null;
