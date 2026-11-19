import { cartConstants, userConstants } from "./constants";
import axios from "../helpers/axios";

export const getAddress = () => {
  return async (dispatch) => {
    dispatch({ type: userConstants.GET_USER_ADDRESS_REQUEST });
    try {
      const res = await axios.post(`/user/getaddress`);
      if (res.status === 200) {
        const {
          userAddress: { address },
        } = res.data;
        dispatch({
          type: userConstants.GET_USER_ADDRESS_SUCCESS,
          payload: { address },
        });
        return address;
      } else {
        const { error } = res.data;
        dispatch({
          type: userConstants.GET_USER_ADDRESS_FAILURE,
          payload: { error },
        });
        return false;
      }
    } catch (error) {
      dispatch({ type: userConstants.GET_USER_ADDRESS_FAILURE, payload: { error: error.response?.data?.message || error.response?.data?.error || error.message } });
      return false;
    }
  };
};

export const addAddress = (payload) => {
  return async (dispatch) => {
    dispatch({ type: userConstants.ADD_USER_ADDRESS_REQUEST });
    try {
      const res = await axios.post(`/user/address/create`, { payload });
      if (res.status === 201) {
        const savedDocument = res.data.address;
        const address = savedDocument.address || [];
        dispatch({
          type: userConstants.ADD_USER_ADDRESS_SUCCESS,
          payload: { address },
        });
        return address.find((item) => String(item._id) === String(payload.address._id)) || address[address.length - 1] || false;
      } else {
        const { error } = res.data;
        dispatch({
          type: userConstants.ADD_USER_ADDRESS_FAILURE,
          payload: { error },
        });
      }
    } catch (error) {
      dispatch({ type: userConstants.ADD_USER_ADDRESS_FAILURE, payload: { error: error.response?.data?.message || error.response?.data?.error || error.message } });
    }
  };
};

export const addOrder = (payload) => {
  return async (dispatch) => {
    dispatch({ type: userConstants.ADD_USER_ORDER_REQUEST });
    try {
      const res = await axios.post(`/addOrder`, payload);
      if (res.status === 201) {
        const { order } = res.data;
        dispatch({
          type: cartConstants.RESET_CART,
        });
        dispatch({
          type: userConstants.ADD_USER_ORDER_SUCCESS,
          payload: { order },
        });
        return order;
      } else {
        const error = res.data?.message || res.data?.error || "Could not place your order.";
        dispatch({
          type: userConstants.ADD_USER_ORDER_FAILURE,
          payload: { error },
        });
      }
    } catch (error) {
      dispatch({
        type: userConstants.ADD_USER_ORDER_FAILURE,
        payload: { error: error.response?.data?.message || error.response?.data?.error || error.message || "Could not place your order." },
      });
      return false;
    }
    return false;
  };
};

export const getOrders = () => {
  return async (dispatch) => {
    dispatch({ type: userConstants.GET_USER_ORDER_REQUEST });
    try {
      const res = await axios.get(`/getOrders`);
      if (res.status === 200) {
        console.log(res);
        const { orders } = res.data;
        dispatch({
          type: userConstants.GET_USER_ORDER_SUCCESS,
          payload: { orders },
        });
      } else {
        const { error } = res.data;
        dispatch({
          type: userConstants.GET_USER_ORDER_FAILURE,
          payload: { error },
        });
      }
    } catch (error) {
      dispatch({ type: userConstants.GET_USER_ORDER_FAILURE, payload: { error: error.response?.data?.message || error.response?.data?.error || error.message } });
    }
  };
};

// single order with complete info and delivery location
export const getOrder = (payload) => {
  return async (dispatch) => {
    dispatch({ type: userConstants.GET_USER_ORDER_DETAILS_REQUEST });
    try {
      const res = await axios.post(`/getOrder`, payload);
      if (res.status === 200) {
        console.log(res);
        const { order } = res.data;
        dispatch({
          type: userConstants.GET_USER_ORDER_DETAILS_SUCCESS,
          payload: { order },
        });
      } else {
        const { error } = res.data;
        dispatch({
          type: userConstants.GET_USER_ORDER_DETAILS_FAILURE,
          payload: { error },
        });
      }
    } catch (error) {
      dispatch({ type: userConstants.GET_USER_ORDER_DETAILS_FAILURE, payload: { error: error.response?.data?.message || error.response?.data?.error || error.message } });
    }
  };
};
