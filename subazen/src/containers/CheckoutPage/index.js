import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiCheck, FiPackage, FiX } from "react-icons/fi";
import { addOrder, getAddress, getCartItems } from "../../actions";
import Layout from "../../components/Layout";
import {
  Anchor,
  MaterialButton,
} from "../../components/MaterialUI";
import PriceDetails from "../../components/PriceDetails";
import Card from "../../components/UI/Card";
import CartPage from "../CartPage";
import AddressForm from "./AddressForm";
import axios from "../../helpers/axios";
import usePageMeta from "../../hooks/usePageMeta";

import "./style.css";

/**
 * @author
 * @function CheckoutPage (Pakistan)
 **/

const CheckoutStep = (props) => {
  return (
    <div className="checkoutStep">
      <div
        id={props.id}
        onClick={props.onClick}
        className={`checkoutHeader ${props.active && "active"}`}
      >
        <div>
          <span className="stepNumber">{props.stepNumber}</span>
          <span className="stepTitle">{props.title}</span>
        </div>
      </div>
      {props.body && props.body}
    </div>
  );
};

const Address = ({
  adr,
  selectAddress,
  enableAddressEditForm,
  confirmDeliveryAddress,
  onAddressSubmit,
}) => {
  return (
    <div className="flexRow addressContainer">
      <div>
        <input
          name="address"
          onClick={() => selectAddress(adr)}
          type="radio"
          checked={adr.selected || false}
          onChange={() => {}}
        />
      </div>
      <div className="flexRow sb addressinfo">
        {!adr.edit ? (
          <div style={{ width: "100%" }}>
            <div className="addressDetail">
              <div>
                <span className="addressName">{adr.name}</span>
                <span className="addressType">{adr.addressType}</span>
                <span className="addressMobileNumber">{adr.mobileNumber}</span>
              </div>
              {adr.selected && (
                <Anchor
                  name="EDIT"
                  onClick={() => enableAddressEditForm(adr)}
                  style={{ fontWeight: "500", color: "#2874f0" }}
                />
              )}
            </div>
            <div className="fullAddress">
              {adr.address} <br />
              {`${adr.city}, ${adr.state}`}
              {adr.pinCode ? ` - ${adr.pinCode}` : ""}
            </div>
            {adr.selected && (
              <MaterialButton
                title="DELIVERY HERE"
                onClick={() => confirmDeliveryAddress(adr)}
                style={{ width: "200px", margin: "10px 0" }}
              />
            )}
          </div>
        ) : (
          <AddressForm
            withoutLayout={true}
            onSubmitForm={onAddressSubmit}
            initialData={adr}
            onCancel={() => {}}
          />
        )}
      </div>
    </div>
  );
};

const CheckoutPage = (props) => {
  const user = useSelector((state) => state.user);
  const auth = useSelector((state) => state.auth);
  const [newAddress, setNewAddress] = useState(false);
  const [address, setAddress] = useState([]);
  const [confirmAddress, setConfirmAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [orderSummary, setOrderSummary] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState(false);
  const [paymentOption, setPaymentOption] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [shippingFee, setShippingFee] = useState(250);
  const [shippingError, setShippingError] = useState("");
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  usePageMeta({ title: "Checkout | Subazen", description: "Confirm your delivery address and Cash on Delivery order.", canonical: `${window.location.origin}/checkout`, robots: "noindex, nofollow" });

  const onAddressSubmit = (addr) => {
    setSelectedAddress(addr);
    setConfirmAddress(true);
    setOrderSummary(true);
    setNewAddress(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectAddress = (addr) => {
    const updatedAddress = address.map((adr) =>
      adr._id === addr._id
        ? { ...adr, selected: true }
        : { ...adr, selected: false }
    );
    setAddress(updatedAddress);
  };

  const confirmDeliveryAddress = (addr) => {
    setSelectedAddress(addr);
    setConfirmAddress(true);
    setOrderSummary(true);
  };

  const enableAddressEditForm = (addr) => {
    const updatedAddress = address.map((adr) =>
      adr._id === addr._id ? { ...adr, edit: true } : { ...adr, edit: false }
    );
    setAddress(updatedAddress);
  };

  const userOrderConfirmation = () => {
    setOrderConfirmation(true);
    setOrderSummary(false);
    setPaymentOption(true);
  };

  const onConfirmOrder = async () => {
    if (!selectedAddress?._id || confirmOrder || !Object.keys(cart.cartItems).length) return;
    setConfirmOrder(true);
    const order = await dispatch(addOrder({ addressId: selectedAddress._id, paymentType: "cod" }));
    if (order?._id) {
      setPlacedOrder(order);
    } else {
      setConfirmOrder(false);
    }
  };

  useEffect(() => {
    if (!auth.authenticate) return;
    setAddressesLoaded(false);
    dispatch(getAddress()).then((savedAddresses) => {
      setAddressesLoaded(true);
      let hasDraft = false;
      try { hasDraft = Boolean(sessionStorage.getItem("subazen.checkout.addressDraft")); } catch (_error) { /* storage may be unavailable */ }
      if (hasDraft || (Array.isArray(savedAddresses) && savedAddresses.length === 0)) setNewAddress(true);
    });
    dispatch(getCartItems());
  }, [auth.authenticate, dispatch]);

  useEffect(() => {
    let current = true;
    if (!selectedAddress) {
      setShippingFee(250);
      setShippingError("");
      return () => { current = false; };
    }
    axios.post("/shipping/quote", { address: selectedAddress })
      .then((response) => {
        if (current) {
          setShippingFee(Number(response.data?.shippingFee ?? 250));
          setShippingError("");
        }
      })
      .catch((error) => {
        if (current) setShippingError(error.response?.data?.message || "Could not calculate delivery charges. Please try again.");
      });
    return () => { current = false; };
  }, [selectedAddress]);

  useEffect(() => {
    const address = user.address.map((adr) => ({
      ...adr,
      selected: false,
      edit: false,
    }));
    setAddress(address);
  }, [user.address]);

  useEffect(() => {
    if (!placedOrder) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setPlacedOrder(null);
        props.history.replace("/");
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [placedOrder, props.history]);

  const closeOrderConfirmation = () => {
    setPlacedOrder(null);
    props.history.replace("/");
  };

  const goToCustomerOrders = () => {
    setPlacedOrder(null);
    props.history.replace("/account/orders");
  };

  const openSignIn = () => window.dispatchEvent(new CustomEvent("subazen:open-auth", { detail: { mode: "login" } }));
  // Format selected address for the "completed" step
  const formatCompletedAddress = () => {
    if (!selectedAddress) return "";
    const pin = selectedAddress.pinCode ? ` - ${selectedAddress.pinCode}` : "";
    return `${selectedAddress.name} — ${selectedAddress.address}, ${selectedAddress.city}, ${selectedAddress.state}${pin}`;
  };

  return (
    <Layout>
      <div className="cartContainer checkout-page-layout">
        <div className="checkoutContainer">
          <CheckoutStep
            stepNumber={"1"}
            title={"LOGIN"}
            active={!auth.authenticate}
            body={
              auth.authenticate ? (
                <div className="loggedInId">
                  <span style={{ fontWeight: 500 }}>{auth.user.fullName}</span>
                  <span style={{ margin: "0 5px" }}>{auth.user.email}</span>
                </div>
              ) : (
                <div className="checkout-login-prompt">
                  <p>Sign in or create a free account to save your delivery address and place this order. Your cart will stay here.</p>
                  <MaterialButton title="Sign in or create account" onClick={openSignIn} />
                </div>
              )
            }
          />

          <CheckoutStep
            id="checkout-address-step"
            stepNumber={"2"}
            title={"DELIVERY ADDRESS"}
            active={!confirmAddress && auth.authenticate}
            body={
              <>
                {confirmAddress ? (
                  <div className="stepCompleted">
                    {formatCompletedAddress()}
                  </div>
                ) : (
                  <>
                  {!address.length && !newAddress && addressesLoaded && <div className="checkout-no-address"><p>Add a delivery address to continue.</p><MaterialButton title="Add delivery address" onClick={() => setNewAddress(true)} /></div>}
                  {address.map((adr) => (
                    <Address
                      key={adr._id}
                      selectAddress={selectAddress}
                      enableAddressEditForm={enableAddressEditForm}
                      confirmDeliveryAddress={confirmDeliveryAddress}
                      onAddressSubmit={onAddressSubmit}
                      adr={adr}
                    />
                  ))
                  }
                  </>
                )}
              </>
            }
          />

          {confirmAddress ? null : newAddress ? (
            <AddressForm onSubmitForm={onAddressSubmit} onCancel={() => {}} />
          ) : auth.authenticate ? (
            <CheckoutStep
              stepNumber={"+"}
              title={"ADD NEW ADDRESS"}
              active={false}
              onClick={() => setNewAddress(true)}
            />
          ) : null}

          <CheckoutStep
            stepNumber={"3"}
            title={"ORDER SUMMARY"}
            active={orderSummary}
            body={
              orderSummary ? (
                <CartPage onlyCartItems={true} />
              ) : orderConfirmation ? (
                <div className="stepCompleted">
                  {Object.keys(cart.cartItems).length} items
                </div>
              ) : null
            }
          />

          {orderSummary && (
            <Card style={{ margin: "10px 0" }}>
              <div
                className="flexRow sb"
                style={{ padding: "20px", alignItems: "center" }}
              >
                <p style={{ fontSize: "12px" }}>
                  Review your items and delivery charge before placing this Cash on Delivery order.
                </p>
                <MaterialButton
                  title="CONTINUE"
                  onClick={userOrderConfirmation}
                  style={{ width: "200px" }}
                />
              </div>
            </Card>
          )}

          <CheckoutStep
            stepNumber={"4"}
            title={"PAYMENT OPTIONS"}
            active={paymentOption}
            body={
              paymentOption && (
                <div>
                  {shippingError && <div className="text-danger px-3" role="alert">{shippingError}</div>}
                  <div
                    className="flexRow"
                    style={{ alignItems: "center", padding: "20px" }}
                  >
                    <input type="radio" name="paymentOption" value="cod" />
                    <div>Cash on Delivery (COD)</div>
                  </div>
                  <MaterialButton
                    title={confirmOrder ? "PLACING ORDER..." : "PLACE COD ORDER"}
                    onClick={onConfirmOrder}
                    style={{ width: "200px", margin: "0 0 20px 20px" }}
                    disabled={confirmOrder || Boolean(shippingError) || user.loading || !selectedAddress?._id}
                  />
                  {user.error && <div className="text-danger px-3" role="alert">{user.error}</div>}
                </div>
              )
            }
          />
        </div>

        <PriceDetails
          totalItem={Object.keys(cart.cartItems).reduce(function (qty, key) {
            return qty + cart.cartItems[key].qty;
          }, 0)}
          totalPrice={Object.keys(cart.cartItems).reduce((totalPrice, key) => {
            const { price, qty } = cart.cartItems[key];
            return totalPrice + price * qty;
          }, 0)}
          shippingFee={shippingFee}
        />
      </div>
      {placedOrder && <div className="order-placed-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeOrderConfirmation(); }}>
        <section className="order-placed-dialog" role="dialog" aria-modal="true" aria-labelledby="order-placed-title" aria-describedby="order-placed-description">
          <button type="button" className="order-placed-close" onClick={closeOrderConfirmation} aria-label="Close order confirmation"><FiX aria-hidden="true" /></button>
          <div className="order-placed-icon"><FiCheck aria-hidden="true" /></div>
          <span className="order-placed-eyebrow">SUBAZEN ORDER UPDATE</span>
          <h1 id="order-placed-title">Your order has been placed</h1>
          <p id="order-placed-description">Thanks for shopping with Subazen. Your Cash on Delivery order is confirmed. Check your order page to see its details and delivery progress.</p>
          <div className="order-placed-reference"><FiPackage aria-hidden="true" /><span>Order number</span><strong>#{String(placedOrder._id).slice(-8).toUpperCase()}</strong></div>
          <div className="order-placed-actions">
            <button type="button" className="order-placed-primary" onClick={goToCustomerOrders}>Check my orders</button>
            <button type="button" className="order-placed-secondary" onClick={closeOrderConfirmation}>Continue shopping</button>
          </div>
        </section>
      </div>}
    </Layout>
  );
};

export default CheckoutPage;
