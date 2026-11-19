import React, { useId, useState } from "react";
import "./style.css";



const Modal = (props) => {
  if (!props.visible) {
    return null;
  }
  return (
    <>
      <div className="modalFixedBg" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose?.(); }}>
        <div className={`modalContainer ${props.className || ""}`} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">{props.children}</div>
      </div>
    </>
  );
};

const MaterialInput = (props) => {
  const [focus, setFocus] = useState(false);
  const [touch, setTouch] = useState(false);
  const generatedId = useId();
  const inputId = props.id || `material-input-${generatedId}`;
  const hasValue = props.value !== undefined && props.value !== null && String(props.value).length > 0;
  const floatingLabel = focus || hasValue;

  return (
    <div className={`materialInput${floatingLabel ? " has-value" : ""}`}>
      <label
        className={`label ${floatingLabel ? "focus" : ""}`}
        htmlFor={inputId}
      >
        {props.label && `Enter ${props.label}`}
      </label>
      <div
        style={{
          display: "flex",
        }}
      >
        <input
          className="input"
          id={inputId}
          aria-label={props.label}
          aria-invalid={touch && !props.value ? "true" : undefined}
          type={props.type}
          value={props.value}
          required={props.required}
          minLength={props.minLength}
          maxLength={props.maxLength}
          autoComplete={props.autoComplete}
          list={props.list}
          onChange={props.onChange}
          onFocus={(e) => {
            setFocus(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            if (e.target.value === "") {
              setFocus(false);
              setTouch(true);
            } else {
              setTouch(false);
            }
            props.onBlur?.(e);
          }}
        />
        {props.rightElement ? props.rightElement : null}
      </div>
      {touch && !props.value && <div className="materialInput-error">{`${props.label} is required`}</div>}
    </div>
  );
};

const MaterialButton = (props) => {
  const onClick = () => {
    props.onClick && props.onClick();
  };
  return (
    <div
      style={{
        width: "100%",
        ...props.style,
      }}
    >
      <button
        className="materialButton"
        disabled={props.disabled}
        type={props.type || "button"}
        style={{
          backgroundColor: props.bgColor,
          color: props.textColor,
          fontSize: props.fontSize,
        }}
        onClick={onClick}
      >
        {props.icon && props.icon}
        {props.title && props.title}
      </button>
    </div>
  );
};

const DropdownMenu = (props) => {
  return (
    <div className="headerDropdownContainer">
      {props.menu}
      <div className="dropdown">
        <div className="upArrowContainer">
          <div className="upArrow"></div>
        </div>
        <div className="dropdownMenu">
          {props.firstMenu}
          <ul className="headerDropdownMenu">
            {props.menus &&
              props.menus.map((item, index) => (
                <li key={index}>
                  <a
                    onClick={(e) => {
                      if (item.onClick) {
                        e.preventDefault();
                        item.onClick && item.onClick();
                      }
                    }}
                    href={`${item.href}`}
                  >
                    {item.icon && <span className="header-dropdown-icon">{item.icon}</span>}
                    {item.label}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const Anchor = (props) => {
  return (
    <button {...props} className="anchorButton">
      {props.name}
    </button>
  );
};

const Breed = (props) => {
  return (
    <div className="breed">
      <ul>
        {props.breed &&
          props.breed.map((item, index) => (
            <li key={index}>
              <a href={item.href}>{item.name}</a>
              {props.breedIcon}
            </li>
          ))}
      </ul>
    </div>
  );
};

export { Modal, MaterialInput, MaterialButton, DropdownMenu, Anchor, Breed };
