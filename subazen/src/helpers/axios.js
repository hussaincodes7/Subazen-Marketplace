import axios from "axios";
import { api } from "../urlConfig";
import store from "../store";
import { authConstants } from "../actions/constants";

const axiosIntance = axios.create({
  baseURL: api,
});

axiosIntance.interceptors.request.use((req) => {
  const { auth } = store.getState();
  // Never keep the module-load token on requests after Redux has logged out.
  if (auth.token) req.headers.Authorization = `Bearer ${auth.token}`;
  else delete req.headers.Authorization;
  return req;
});

axiosIntance.interceptors.response.use(
  (res) => {
    return res;
  },
  (error) => {
    console.log(error.response);
    const status = error.response?.status;
    if (status === 401 && store.getState().auth.token) {
      localStorage.removeItem("token");
      store.dispatch({ type: authConstants.LOGOUT_SUCCESS });
    }
    return Promise.reject(error);
  }
);

export default axiosIntance;
