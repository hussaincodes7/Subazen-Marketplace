import { userConstants } from "./constants";
import axios, { getApiErrorMessage } from "../helpers/axios";

export const signup = (user) => {
  return async (dispatch) => {
    dispatch({ type: userConstants.USER_REGISTER_REQUEST });
    
    try {
      const res = await axios.post('/admin/signup', {
        ...user
      });

      dispatch({
        type: userConstants.USER_REGISTER_SUCCESS,
        payload: { message: res.data?.message || 'Admin account created successfully' }
      });
      return true;
    } catch (error) {
      dispatch({
        type: userConstants.USER_REGISTER_FAILURE,
        payload: { error: getApiErrorMessage(error, 'Admin signup failed.') }
      });
      return false;
    }
  };
};
