import { orderConstants } from "../actions/constants";

const initState = {
  orders: [],
  loading: false,
  error: null,
};

const orderReducer = (state = initState, action) => {
  switch (action.type) {
    case orderConstants.GET_CUSTOMER_ORDER_REQUEST:
    case orderConstants.UPDATE_CUSTOMER_ORDER_REQUEST:
      return { ...state, loading: true, error: null };
    case orderConstants.GET_CUSTOMER_ORDER_SUCCESS:
      return { ...state, loading: false, error: null, orders: action.payload.orders || [] };
    case orderConstants.UPDATE_CUSTOMER_ORDER_SUCCESS:
      return { ...state, loading: false, error: null };
    case orderConstants.GET_CUSTOMER_ORDER_FAILURE:
    case orderConstants.UPDATE_CUSTOMER_ORDER_FAILURE:
      return { ...state, loading: false, error: action.payload?.error || "Could not load orders." };
    default:
      return state;
  }
};

export default orderReducer;
