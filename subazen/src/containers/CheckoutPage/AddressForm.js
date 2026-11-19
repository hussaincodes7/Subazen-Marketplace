import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addAddress } from "../../actions";
import { MaterialButton, MaterialInput } from "../../components/MaterialUI";
import { pakistanCities } from "./pakistanCities";
import axios from "../../helpers/axios";

/**
 * @author
 * @function AddressForm (Pakistan)
 **/

const AddressForm = (props) => {
  const draftKey = "subazen.checkout.addressDraft";
  const storedDraft = (() => { try { return JSON.parse(sessionStorage.getItem(draftKey) || "null"); } catch (_error) { return null; } })();
  const initialData = props.initialData || storedDraft;

  const [name, setName] = useState(initialData?.name || "");
  const [mobileNumber, setMobileNumber] = useState(initialData?.mobileNumber || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityOptions, setCityOptions] = useState(pakistanCities);
  const [cityOptionsLoaded, setCityOptionsLoaded] = useState(false);
  const [cityOptionsLoading, setCityOptionsLoading] = useState(false);
  const [cityOptionsError, setCityOptionsError] = useState(false);
  const cityAutocompleteRef = useRef(null);
  const [state, setState] = useState(initialData?.state || "");
  const [pinCode, setPinCode] = useState(initialData?.pinCode || "");
  const [landmark, setLandmark] = useState(initialData?.landmark || "");
  const [alternatePhone, setAlternatePhone] = useState(initialData?.alternatePhone || "");
  const [addressType, setAddressType] = useState(initialData?.addressType || "");

  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const [formError, setFormError] = useState("");
  const [id] = useState(initialData?._id || "");

  const pakistaniProvinces = [
    "Punjab",
    "Sindh",
    "Khyber Pakhtunkhwa",
    "Balochistan",
    "Gilgit-Baltistan",
    "Azad Jammu and Kashmir",
    "Islamabad Capital Territory",
  ];
  const cityOptionSet = useMemo(() => new Set(cityOptions.map((item) => item.toLocaleLowerCase())), [cityOptions]);
  const matchingCities = useMemo(() => {
    const query = citySearch.trim().toLocaleLowerCase();
    return cityOptions.filter((cityName) => !query || cityName.toLocaleLowerCase().includes(query)).slice(0, 50);
  }, [cityOptions, citySearch]);

  useEffect(() => {
    if (!cityMenuOpen || cityOptionsLoaded || cityOptionsLoading) return undefined;
    setCityOptionsLoading(true);
    axios.get("/locations/pakistan-populated-places.json")
      .then((response) => {
        const places = Array.isArray(response.data) ? response.data.filter((place) => typeof place === "string" && place.trim()) : [];
        if (places.length) setCityOptions([...new Set([...pakistanCities, ...places])].sort((a, b) => a.localeCompare(b)));
        else setCityOptionsError(true);
        setCityOptionsLoaded(true);
      })
      .catch(() => { setCityOptionsError(true); setCityOptionsLoaded(true); })
      .finally(() => setCityOptionsLoading(false));
    return undefined;
  }, [cityMenuOpen, cityOptionsLoaded, cityOptionsLoading]);

  // Pakistani mobile: 03XXXXXXXXX or +923XXXXXXXXX
  const isValidPakistaniMobile = (num) =>
    /^(\+92|0)?3\d{9}$/.test((num || "").replace(/\s|-/g, ""));

  useEffect(() => {
    if (!id && [name, mobileNumber, address, city, state, pinCode, landmark, alternatePhone, addressType].some((value) => String(value || "").trim())) {
      try { sessionStorage.setItem(draftKey, JSON.stringify({ name, mobileNumber, address, city, state, pinCode, landmark, alternatePhone, addressType })); } catch (_error) { /* storage may be unavailable */ }
    }
  }, [id, name, mobileNumber, address, city, state, pinCode, landmark, alternatePhone, addressType]);

  const onAddressSubmit = async () => {
    setFormError("");
    if (!name.trim() || !mobileNumber.trim() || !address.trim() || !city.trim() || !state || !addressType) {
      setFormError("Complete your name, phone, address, city, province, and address type.");
      return;
    }
    if (!isValidPakistaniMobile(mobileNumber)) {
      setFormError("Enter a valid Pakistani mobile number, such as 03001234567.");
      return;
    }
    if (alternatePhone && !isValidPakistaniMobile(alternatePhone)) {
      setFormError("Enter a valid alternate Pakistani phone number.");
      return;
    }
    if (pinCode && !/^\d{6}$/.test(pinCode)) {
      setFormError("Postal code must have 6 digits, or leave it blank.");
      return;
    }

    const payload = {
      address: {
        name,
        mobileNumber: mobileNumber.replace(/\s|-/g, ""),
        address,
        city,
        state,
        pinCode,
        landmark,
        alternatePhone: alternatePhone.replace(/\s|-/g, ""),
        addressType,
      },
    };

    if (id) payload.address._id = id;

    const savedAddress = await dispatch(addAddress(payload));
    if (!savedAddress) return;
    try { sessionStorage.removeItem(draftKey); } catch (_error) { /* storage may be unavailable */ }
    props.onSubmitForm(savedAddress);
  };

  const renderAddressForm = () => (
    <>
      <div className="address-fields address-fields-pair">
        <div className="address-form-field">
          <MaterialInput
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="address-form-field">
          <MaterialInput
            label="Mobile Number"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
          />
        </div>
      </div>

      <div className="address-fields">
        <div className="address-form-field">
          <MaterialInput
            label="Full Delivery Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>

      <div className="address-fields address-fields-pair">
        <div className="address-form-field">
          <div className="city-autocomplete" ref={cityAutocompleteRef}>
            <MaterialInput
              id="checkout-city"
              label="City"
              value={city}
              onChange={(e) => { setCity(e.target.value); setCityMenuOpen(true); }}
              onFocus={() => { setCityMenuOpen(true); setCitySearch(""); }}
              onBlur={(event) => { if (!cityAutocompleteRef.current?.contains(event.relatedTarget)) window.setTimeout(() => setCityMenuOpen(false), 120); }}
              rightElement={<button className="city-picker-toggle" type="button" aria-label="Show city suggestions" aria-expanded={cityMenuOpen} aria-controls="checkout-city-suggestions" onMouseDown={(event) => event.preventDefault()} onClick={() => { setCityMenuOpen((open) => !open); setCitySearch(""); }}>▾</button>}
            />
            {cityMenuOpen && <div className="city-suggestions" id="checkout-city-suggestions" role="dialog" aria-label="Search and choose your city">
              <label htmlFor="checkout-city-search">Search cities and towns</label>
              <input id="checkout-city-search" type="search" className="city-suggestions-search" placeholder="Type a city or town" value={citySearch} autoComplete="off" onChange={(event) => setCitySearch(event.target.value)} />
              {cityOptionsLoading && <div className="city-suggestions-status" role="status">Loading Pakistan locations…</div>}
              {cityOptionsError && <div className="city-suggestions-status">You can still type and use any city or town.</div>}
              <div className="city-suggestions-list" role="listbox" aria-label="Matching places">
                {citySearch.trim() && !cityOptionSet.has(citySearch.trim().toLocaleLowerCase()) && <button type="button" className="city-custom-option" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => { setCity(citySearch.trim()); setCityMenuOpen(false); setCitySearch(""); }}>Use “{citySearch.trim()}”</button>}
                {matchingCities.map((cityName) => <button key={cityName} type="button" role="option" aria-selected={cityName.toLocaleLowerCase() === city.trim().toLocaleLowerCase()} onMouseDown={(event) => event.preventDefault()} onClick={() => { setCity(cityName); setCityMenuOpen(false); setCitySearch(""); }}>{cityName}</button>)}
                {!cityOptionsLoading && citySearch.trim() && matchingCities.length === 0 && <div className="city-suggestions-empty">No match in the list. Choose “Use {citySearch.trim()}” above.</div>}
                {!cityOptionsLoading && !citySearch.trim() && matchingCities.length === 0 && <div className="city-suggestions-empty">Start typing to search.</div>}
              </div>
            </div>}
          </div>
        </div>
        <div className="address-form-field">
          <label className="checkout-field-label" htmlFor="checkout-province">Province / Territory</label>
          <select
            id="checkout-province"
            aria-label="Province or territory"
            value={state}
            onChange={(e) => setState(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <option value="">Select Province</option>
            {pakistaniProvinces.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="address-fields">
        <div className="address-form-field">
          <MaterialInput
            label="Postal Code (Optional)"
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
          />
        </div>
      </div>

      <div className="address-fields">
        <div className="address-form-field">
          <MaterialInput
            label="Alternate Phone (Optional)"
            value={alternatePhone}
            onChange={(e) => setAlternatePhone(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label>Address Type</label>
        <div className="flexRow">
          <div>
            <input
              type="radio"
              checked={addressType === "home"}
              onChange={() => setAddressType("home")}
              name="addressType"
              value="home"
            />
            <span>Home</span>
          </div>
          <div>
            <input
              type="radio"
              checked={addressType === "work"}
              onChange={() => setAddressType("work")}
              name="addressType"
              value="work"
            />
            <span>Work</span>
          </div>
        </div>
      </div>
      {formError && <p className="address-form-error" role="alert">{formError}</p>}

      <div className="address-fields">
        <MaterialButton
          title="SAVE AND DELIVER HERE"
          onClick={onAddressSubmit}
          style={{ width: "250px", margin: "20px 0" }}
        />
      </div>
      {user.error && <p className="text-danger" role="alert">{user.error}</p>}
    </>
  );

  if (props.withoutLayout) {
    return <div>{renderAddressForm()}</div>;
  }

  return (
    <div className="checkoutStep" style={{ background: "#f5faff" }}>
      <div className="checkoutHeader">
        <div>
          <span className="stepNumber">+</span>
          <span className="stepTitle">ADD NEW ADDRESS</span>
        </div>
      </div>
      <div className="checkout-address-form">
        {renderAddressForm()}
      </div>
    </div>
  );
};

export default AddressForm;
