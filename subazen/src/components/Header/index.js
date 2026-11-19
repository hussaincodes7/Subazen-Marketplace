import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./style.css";
import subazentLogo from "../../Images/subazen.png";
//import goldenStar from "../../images/logo/";
import { FiChevronDown, FiFileText, FiLogIn, FiLogOut, FiPackage, FiSearch, FiUser } from "react-icons/fi";
import {
  Modal,
  MaterialInput,
  MaterialButton,
  DropdownMenu,
} from "../MaterialUI";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import axios from "../../helpers/axios";
import { login, signout, signup as _signup } from "../../actions";
import Cart from "../UI/Cart";
import { generatePublicUrl } from "../../urlConfig";

/**
 * @author
 * @function Header
 **/

const Header = (props) => {
  const headerRef = useRef(null);
  const [loginModal, setLoginModal] = useState(false);
  const [signup, setSignup] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const history = useHistory();
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useLayoutEffect(() => {
    const headerNode = headerRef.current;
    if (!headerNode) return undefined;
    const syncHeaderHeight = () => {
      const height = Math.ceil(headerNode.getBoundingClientRect().height);
      if (height > 0) document.documentElement.style.setProperty("--store-header-height", `${height}px`);
    };
    syncHeaderHeight();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncHeaderHeight) : null;
    observer?.observe(headerNode);
    window.addEventListener("resize", syncHeaderHeight, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncHeaderHeight);
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchSuggestions([]);
      return undefined;
    }
    let active = true;
    const timeout = window.setTimeout(() => {
      axios.get("/search", { params: { q: query } })
        .then((response) => {
          if (!active) return;
          const products = response.data?.products || [];
          const suggestions = response.data?.suggestions || [];
          const productSuggestions = suggestions.map((suggestion) => {
            if (typeof suggestion === "object") return suggestion;
            return products.find((product) => product.name === suggestion) || { name: suggestion };
          });
          setSearchSuggestions(productSuggestions);
        })
        .catch(() => { if (active) setSearchSuggestions([]); });
    }, 250);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [searchQuery]);

  const submitSearch = (event, query = searchQuery) => {
    event?.preventDefault();
    const value = String(query || "").trim();
    if (!value) return;
    window.localStorage.setItem("subazen-search-intent", value);
    setSearchSuggestions([]);
    history.push(`/search?q=${encodeURIComponent(value)}`);
  };

  // state cart value
  const cart = useSelector((state) => state.cart);

  const userLogin = (event) => {
    event?.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email address to continue.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (forgotPasswordMode) {
      setForgotPasswordLoading(true);
      setForgotPasswordNotice("");
      axios.post("/forgot-password", { email: email.trim() })
        .then((response) => setForgotPasswordNotice(response.data?.message || "If an account exists for that email, a reset link will be sent shortly."))
        .catch((requestError) => setError(requestError.response?.data?.message || "Could not request a reset link. Please try again."))
        .finally(() => setForgotPasswordLoading(false));
      return;
    }
    if (!password) {
      setError("Enter your password to continue.");
      return;
    }
    if (signup) {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Enter your first and last name.");
        return;
      }
      if (password.length < 6) {
        setError("Your password must be at least 6 characters.");
        return;
      }
      dispatch(_signup({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password }));
      return;
    }
    dispatch(login({ email: email.trim(), password }));
  };

  const changeAuthMode = useCallback((nextMode) => {
    setSignup(nextMode);
    setForgotPasswordMode(false);
    setForgotPasswordNotice("");
    setError("");
    dispatch({ type: "CLEAR_AUTH_ERROR" });
  }, [dispatch]);

  const logout = () => {
    dispatch(signout());
  };

  useEffect(() => {
    if (auth.authenticate) {
      setLoginModal(false);
    }
  }, [auth.authenticate]);

  useEffect(() => {
    const openAuth = (event) => {
      changeAuthMode(event.detail?.mode === "signup");
      setLoginModal(true);
    };
    window.addEventListener("subazen:open-auth", openAuth);
    return () => window.removeEventListener("subazen:open-auth", openAuth);
  }, [changeAuthMode]);

  // useEffect(() => {
  //   dispatch(getCartItems());
  // }, []);

  const renderLoggedInMenu = () => {
    return (
      <DropdownMenu
        menu={<button type="button" className="account-trigger"><FiUser aria-hidden="true" /><span>{auth.user.fullName || `${auth.user.firstName || "My"} ${auth.user.lastName || "Account"}`}</span><FiChevronDown aria-hidden="true" /></button>}
        menus={[
          {
            label: "Orders",
            href: `/account/orders`,
            icon: <FiPackage aria-hidden="true" />,
          },
          { label: "Refund Policy", href: "/pages/return-policy", icon: <FiFileText aria-hidden="true" /> },
          { label: "Sign out", href: "", icon: <FiLogOut aria-hidden="true" />, onClick: logout },
        ]}
      />
    );
  };

  const renderNonLoggedInMenu = () => {
    return (
      <DropdownMenu
        menu={<button type="button" className="loginButton account-trigger" onClick={() => { changeAuthMode(false); setLoginModal(true); }}><FiUser aria-hidden="true" /><span>Login</span><FiChevronDown aria-hidden="true" /></button>}
        menus={[
          {
            label: "Sign in",
            href: "",
            icon: <FiLogIn aria-hidden="true" />,
            onClick: () => { changeAuthMode(false); setLoginModal(true); },
          },
          {
            label: "Orders",
            href: `/account/orders`,
            icon: <FiPackage aria-hidden="true" />,
            onClick: () => {
              !auth.authenticate && setLoginModal(true);
            },
          },
          { label: "Refund Policy", href: "/pages/return-policy", icon: <FiFileText aria-hidden="true" /> },
        ]}
        firstMenu={
            <div className="firstmenu">
            <span>New Customer?</span>
            <button type="button" onClick={() => { setLoginModal(true); changeAuthMode(true); }}>Sign up</button>
          </div>
        }
      />
    );
  };

  return (
    <div className="header" ref={headerRef}>
      <Modal visible={loginModal} onClose={() => setLoginModal(false)} className="auth-modal">
        <div className={`authContainer ${signup ? "is-signup" : forgotPasswordMode ? "is-forgot" : "is-login"}`}>
          <aside className="auth-intro">
            <span className="auth-brand-kicker">SUBAZEN</span>
            <h2 id="auth-modal-title">{signup ? "Join Subazen" : forgotPasswordMode ? "Reset your password" : "Welcome back"}</h2>
            <p>{signup ? "Create an account to keep track of orders and check out faster." : forgotPasswordMode ? "We’ll email you a secure link to choose a new password." : "Sign in to view your orders and continue checkout."}</p>
          </aside>
          <section className="auth-panel" aria-labelledby="auth-modal-title">
            <div className="auth-panel-heading">
              <span>{signup ? "CREATE ACCOUNT" : forgotPasswordMode ? "ACCOUNT RECOVERY" : "YOUR ACCOUNT"}</span>
              <h3>{signup ? "Sign up" : forgotPasswordMode ? "Forgot password?" : "Login"}</h3>
              <p>{signup ? "It only takes a minute to get started." : forgotPasswordMode ? "Enter the email address on your account." : "Enter your details to continue."}</p>
            </div>
            <form className="auth-form" noValidate onSubmit={userLogin}>
              {signup && <div className="auth-name-fields">
                <MaterialInput type="text" label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required />
                <MaterialInput type="text" label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required />
              </div>}
              <MaterialInput type="email" label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              {!forgotPasswordMode && <MaterialInput type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} required minLength={6} />}
              {!signup && !forgotPasswordMode && <button className="forgot-password-link" type="button" onClick={() => { setForgotPasswordMode(true); setForgotPasswordNotice(""); setError(""); }}>Forgot password?</button>}
              {forgotPasswordNotice && <div className="auth-success" role="status">{forgotPasswordNotice}</div>}
              {(error || (!forgotPasswordMode && auth.error && auth.error !== "Failed to login")) && <div className="auth-error" role="alert">{error || auth.error}</div>}
              <MaterialButton type="submit" title={signup ? "Create account" : forgotPasswordMode ? (forgotPasswordLoading ? "Sending…" : "Send reset link") : "Login"} bgColor="#2874f0" textColor="#ffffff" style={{ margin: "1.5rem 0 .5rem" }} disabled={auth.authenticating || forgotPasswordLoading} />
              <p className="auth-switch">
                {forgotPasswordMode ? "Remembered your password?" : signup ? "Already have an account?" : "New to Subazen?"}
                <button type="button" onClick={() => forgotPasswordMode ? changeAuthMode(false) : changeAuthMode(!signup)}>{forgotPasswordMode || signup ? "Login" : "Create an account"}</button>
              </p>
            </form>
          </section>
          <button className="modalClose" type="button" aria-label="Close sign in dialog" onClick={() => setLoginModal(false)}>×</button>
        </div>
      </Modal>
      <div className="subHeader">
        <a className="store-logo" href="/" aria-label="Subazen home">
          <img src={subazentLogo} alt="Subazen" />
        </a>

        {/* search component */}
        <div className="header-search-area">
          <form className="searchInputContainer" role="search" onSubmit={submitSearch}>
            <input
              className="searchInput"
              placeholder="Search products, brands and categories"
              aria-label="Search Subazen"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Escape") setSearchSuggestions([]); }}
            />
            <button className="searchIconContainer" type="submit" aria-label="Submit search"><FiSearch aria-hidden="true" /></button>
            {searchSuggestions.length > 0 && <div className="search-suggestions" role="listbox">
              {searchSuggestions.map((suggestion, index) => {
                const image = suggestion.productPictures?.[suggestion.featuredImageIndex || 0]?.img || suggestion.productPictures?.[0]?.img;
                return <button key={suggestion._id || `${suggestion.name}-${index}`} type="button" role="option" aria-selected="false" className="search-suggestion-item" onClick={(event) => {
                  event.preventDefault();
                  window.localStorage.setItem("subazen-search-intent", suggestion.name);
                  setSearchSuggestions([]);
                  if (suggestion.slug) history.push(`/products/${suggestion.slug}`);
                  else submitSearch(event, suggestion.name);
                }}>
                  <span className="search-suggestion-image">{image ? <img src={generatePublicUrl(image)} alt="" /> : <FiSearch aria-hidden="true" />}</span>
                  <span className="search-suggestion-copy"><strong>{suggestion.name}</strong>{suggestion.category?.name && <small>{suggestion.category.name}</small>}</span>
                  {suggestion.price !== undefined && <span className="search-suggestion-price">Rs. {Number(suggestion.price).toLocaleString("en-PK")}</span>}
                </button>;
              })}
              <button type="submit" className="search-all-results" onClick={(event) => submitSearch(event)}><FiSearch aria-hidden="true" /> View all results for “{searchQuery.trim()}”</button>
            </div>}
          </form>
        </div>
        {/* search component ends here */}

        {/* right side menu */}
        <div className="rightMenu">
          {auth.authenticate ? renderLoggedInMenu() : renderNonLoggedInMenu()}
          <div>
            <a href={`/cart`} className="cart">
              <Cart count={Object.keys(cart.cartItems).length} />
              <span>Cart</span>
            </a>
          </div>
        </div>
        {/* right side menu ends here */}
      </div>
    </div>
  );
};

export default Header;
