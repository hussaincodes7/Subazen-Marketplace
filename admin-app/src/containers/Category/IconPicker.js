import React, { useMemo, useState } from "react";
import * as Fa from "react-icons/fa";
import * as Md from "react-icons/md";
import * as Bs from "react-icons/bs";
import * as Io from "react-icons/io5";
import * as Tb from "react-icons/tb";
import * as Lu from "react-icons/lu";
import { Form } from "react-bootstrap";
import "./IconPicker.css";

const iconPacks = [Fa, Md, Bs, Io, Tb, Lu];
const iconRegistry = Object.assign({}, ...iconPacks);
const iconLabel = (name) => name.replace(/^(Fa|Md|Bs|Io|Tb|Lu)/, "").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
const icons = [...new Set(iconPacks.flatMap((pack) => Object.keys(pack).filter((key) => typeof pack[key] === "function")))].map((key) => [key, iconLabel(key)])
  .sort((a, b) => a[1].localeCompare(b[1]));

export default function IconPicker({ value = "", onChange }) {
  const [search, setSearch] = useState("");
  const matches = useMemo(() => icons.filter(([key, label]) => `${key} ${label}`.toLowerCase().includes(search.trim().toLowerCase())), [search]);
  const visibleIcons = matches.slice(0, search.trim() ? 180 : 96);
  return <div className="category-icon-picker">
    <Form.Control type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${icons.length.toLocaleString()}+ SVG icons (laptop, cable, mobile…)`} aria-label="Search category icons" />
    <div className="category-icon-options" role="listbox" aria-label="React Icons category icons">
      <button type="button" className={!value ? "is-selected" : ""} aria-selected={!value} onClick={() => onChange("")}><span>Auto</span><small>Use default</small></button>
      {visibleIcons.map(([key, label]) => { const Icon = iconRegistry[key]; return <button type="button" role="option" aria-selected={value === key} className={value === key ? "is-selected" : ""} key={key} onClick={() => onChange(key)}><Icon aria-hidden="true" /><span>{label}</span><small>{key}</small></button>; })}
      {matches.length > visibleIcons.length && <p className="category-icon-result-note">Showing {visibleIcons.length} of {matches.length} matches. Search to narrow the list.</p>}
      {!matches.length && <p className="category-icon-no-results">No icons match that search.</p>}
    </div>
  </div>;
}
