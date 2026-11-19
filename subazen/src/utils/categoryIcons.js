import * as Fa from "react-icons/fa";
import * as Md from "react-icons/md";
import * as Bs from "react-icons/bs";
import * as Io from "react-icons/io5";
import * as Tb from "react-icons/tb";
import * as Lu from "react-icons/lu";

export const categoryIconRegistry = { ...Fa, ...Md, ...Bs, ...Io, ...Tb, ...Lu };

export const categoryIconDefaults = {
  electronics: "FaBolt", appliances: "FaHome", fashion: "FaTshirt", men: "FaTshirt", women: "FaTshirt",
  mobiles: "FaMobileAlt", phone: "FaMobileAlt", home: "FaHome", furniture: "FaCouch", printing: "FaPrint",
  books: "FaBook", sports: "FaDumbbell", "sports books & more": "FaBook", beauty: "FaSpa", refrigerator: "FaSnowflake",
  "air conditioners": "FaSnowflake", camera: "FaCamera", computers: "FaLaptop", "computers & accessories": "FaLaptop",
  gaming: "FaGamepad", toys: "FaPuzzlePiece", grocery: "FaShoppingBasket", food: "FaUtensils", automotive: "FaCar",
  "auto accessories": "FaCar", health: "FaHeartbeat", kitchen: "FaUtensils", lighting: "FaLightbulb", tools: "FaWrench",
};

export const getCategoryIcon = (category = {}) => {
  const key = category.iconKey || categoryIconDefaults[String(category.name || "").trim().toLowerCase()] || "FaShoppingBag";
  return categoryIconRegistry[key] || categoryIconRegistry.FaShoppingBag;
};
