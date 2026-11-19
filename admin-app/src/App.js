import React, { useEffect, useRef } from "react";
import { Route, Switch } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getTokenExpiration, isUserLoggedIn } from "./actions/auth.actions";
import { setAuthFailureHandler } from "./helpers/axios";
import { authConstants } from "./actions/constants";
import "./App.css";
import Home from "./containers/Home";
import Signup from "./containers/Signup";
import Signin from "./containers/Signin";
import PrivateRoute from "./components/HOC/PrivateRoute";
import Products from "./containers/Products";
import Orders from "./containers/Orders";
import Category from "./containers/Category";
import NewPage from "./containers/NewPage";
import AdminProfile from "./containers/AdminProfile";
import { getInitialData } from "./actions/initialData.action";
import Shipping from "./containers/Shipping";
import Homepage from "./containers/Homepage";
import FooterSettings from "./containers/FooterSettings";
import Reviews from "./containers/Reviews";
import ContactInbox from "./containers/ContactInbox";
import BrandManager from "./containers/BrandManager";
import TrackingSettings from "./containers/TrackingSettings";
function App() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const initialDataRequested = useRef(false);

 useEffect(() => {
    setAuthFailureHandler(() => {
      dispatch({ type: authConstants.LOGOUT_SUCCESS });
    });
    return () => setAuthFailureHandler(null);
}, [dispatch]);

 useEffect(() => {
    if (!auth.authenticate) {
        dispatch(isUserLoggedIn());
        return;
    }
    if (!initialDataRequested.current) {
        initialDataRequested.current = true;
        dispatch(getInitialData());
    }
}, [auth.authenticate, dispatch]);

 useEffect(() => {
    if (!auth.authenticate || !auth.token) {
        return undefined;
    }

    const expiresAt = getTokenExpiration(auth.token);
    if (!expiresAt || expiresAt <= Date.now()) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: authConstants.LOGOUT_SUCCESS });
        return undefined;
    }

    const timeout = window.setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: authConstants.LOGOUT_SUCCESS });
    }, Math.min(expiresAt - Date.now(), 2147483647));

    return () => window.clearTimeout(timeout);
}, [auth.authenticate, auth.token, dispatch]);
  return (
    <div className="App">
      <Switch>
        <PrivateRoute path="/" exact component={Home} />
        <PrivateRoute path="/pages" component={NewPage} />
        <PrivateRoute path="/profile" component={AdminProfile} />
        <PrivateRoute path="/category" component={Category} />
        <PrivateRoute path="/brands" allowedRoles={["admin"]} component={BrandManager} />
        <PrivateRoute path="/products" component={Products} />
        <PrivateRoute path="/orders" allowedRoles={["admin"]} component={Orders} />
        <PrivateRoute path="/shipping" allowedRoles={["admin"]} component={Shipping} />
        <PrivateRoute path="/homepage" allowedRoles={["admin"]} component={Homepage} />
        <PrivateRoute path="/footer" allowedRoles={["admin"]} component={FooterSettings} />
        <PrivateRoute path="/tracking" allowedRoles={["admin"]} component={TrackingSettings} />
        <PrivateRoute path="/reviews" allowedRoles={["admin"]} component={Reviews} />
        <PrivateRoute path="/contact-messages" allowedRoles={["admin"]} component={ContactInbox} />
        <Route path="/signin" component={Signin} />
        <Route path="/signup" component={Signup} />
      </Switch>
    </div>
  );
}

export default App;
