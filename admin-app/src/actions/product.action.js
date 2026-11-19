import axios from "../helpers/axios";
import { productConstants } from "./constants";

export const clearProductError = () => ({
  type: productConstants.CLEAR_PRODUCT_ERROR,
});

// new action
const getProducts = () => {
  return async (dispatch) => {
    try {
      dispatch({ type: productConstants.GET_ALL_PRODUCTS_REQUEST });
      const res = await axios.post(`product/getProducts`);
      if (res.status === 200) {
        const { products } = res.data;
        dispatch({
          type: productConstants.GET_ALL_PRODUCTS_SUCCESS,
          payload: { products },
        });
      } else {
        dispatch({ type: productConstants.GET_ALL_PRODUCTS_FAILURE });
      }
    } catch (error) {
      console.log(error);
    }
  };
};

// modified actrion
export const addProduct = (form) => {
  return async (dispatch) => {
    dispatch({ type: productConstants.ADD_PRODUCT_REQUEST });
    try {
      const res = await axios.post('/product/create', form);
      if (!res.data?.product?._id) throw new Error('The server did not return the saved product.');
      dispatch({ type: productConstants.ADD_PRODUCT_SUCCESS, payload: { product: res.data.product } });
      return res.data.product;
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message;
      dispatch({
        type: productConstants.ADD_PRODUCT_FAILURE,
        payload: { error: message }
      });
      return { error: message };
    }
  };
};

export const updateProduct = (productId, form) => async (dispatch) => {
  dispatch({ type: productConstants.UPDATE_PRODUCT_REQUEST });
  try {
    const res = await axios.put(`/product/${productId}`, form);
    if (!res.data?.product?._id) throw new Error('The server did not return the updated product.');
    dispatch({ type: productConstants.UPDATE_PRODUCT_SUCCESS, payload: { product: res.data.product } });
    return res.data.product;
  } catch (error) {
    const message = error.response?.data?.message || error.response?.data?.error || error.message;
    dispatch({
      type: productConstants.UPDATE_PRODUCT_FAILURE,
      payload: { error: message }
    });
    return { error: message };
  }
};

export const deleteProductById = (productId) => async (dispatch) => {
  dispatch({ type: productConstants.DELETE_PRODUCT_REQUEST });
  try {
    await axios.delete(`/product/${productId}`);
    dispatch({ type: productConstants.DELETE_PRODUCT_SUCCESS, payload: { productId } });
    return true;
  } catch (error) {
    const message = error.response?.data?.message || error.response?.data?.error || error.message;
    dispatch({
      type: productConstants.DELETE_PRODUCT_FAILURE,
      payload: { error: message }
    });
    return { error: message };
  }
};

