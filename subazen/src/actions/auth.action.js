import { authConstants, cartConstants } from "./constants";
import axios from "../helpers/axios";

export const getTokenExpiration = (token) => {
  try {
    const segment = String(token || "").split(".")[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(segment.length / 4) * 4, "=");
    const exp = JSON.parse(window.atob(base64)).exp;
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch { return null; }
};

const tokenIsExpired = (token) => {
  const expiresAt = getTokenExpiration(token);
  return !expiresAt || expiresAt <= Date.now();
};

// new update signup action
export const signup = (user) => {
  return async (dispatch) => {
    let res;
    try {
      dispatch({ type: authConstants.SIGNUP_REQUEST });
      res = await axios.post(`/signup`, user);
      if (res.status === 201) {
        dispatch({ type: authConstants.SIGNUP_SUCCESS });
        const { token, user } = res.data;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        dispatch({
          type: authConstants.LOGIN_SUCCESS,
          payload: {
            token,
            user,
          },
        });
        return true;
      } else {
        const { error } = res.data;
        dispatch({ type: authConstants.SIGNUP_FAILURE, payload: { error } });
      }
    } catch (error) {
      dispatch({
        type: authConstants.SIGNUP_FAILURE,
        payload: { error: error.response?.data?.message || error.response?.data?.error || error.message || "Sign-up failed." },
      });
      return false;
    }
  };
};

export const login = (user) => {
  return async (dispatch) => {
    dispatch({ type: authConstants.LOGIN_REQUEST });
    let res;
    try {
      res = await axios.post(`/signin`, { ...user });
    } catch (error) {
      dispatch({ type: authConstants.LOGIN_FAILURE, payload: { error: error.response?.data?.message || error.response?.data?.error || error.message || "Sign-in failed." } });
      return false;
    }

    if (res.status === 200) {
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      dispatch({
        type: authConstants.LOGIN_SUCCESS,
        payload: {
          token,
          user,
        },
      });
      return true;
    } else {
      if (res.status === 400) {
        dispatch({
          type: authConstants.LOGIN_FAILURE,
          payload: { error: res.data.error },
        });
      }
    }
    return false;
  };
};

export const isUserLoggedIn = () => {
  return async (dispatch) => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        if (tokenIsExpired(token)) throw new Error("Expired session");
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user) throw new Error("Missing user session");
        dispatch({ type: authConstants.LOGIN_SUCCESS, payload: { token, user } });
      } catch (_error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        dispatch({ type: authConstants.LOGOUT_SUCCESS });
      }
    }
  };
};

export const signout = () => {
  return async (dispatch) => {
    dispatch({ type: authConstants.LOGOUT_REQUEST });
    // localStorage.removeItem('user');
    // localStorage.removeItem('token');
    localStorage.clear();
    dispatch({ type: authConstants.LOGOUT_SUCCESS });
    dispatch({ type: cartConstants.RESET_CART });
    //const res = await axios.post(`/admin/signout`);
    // if(res.status === 200){

    // }else{
    //     dispatch({
    //         type: authConstants.LOGOUT_FAILURE,
    //         payload: { error: res.data.error }
    //     });
    // }
  };
};
