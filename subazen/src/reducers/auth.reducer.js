import { authConstants } from "../actions/constants";

const initState = {
  token: null,
  user: {
    firstName: "",
    lastName: "",
    email: "",
    picture: "",
  },
  authenticate: false,
  authenticating: false,
  loading: false,
  error: null,
  message: "",
};

export default (state = initState, action) => {
  console.log(action);

  switch (action.type) {
    case authConstants.CLEAR_AUTH_ERROR:
      state = { ...state, error: null };
      break;
    case authConstants.LOGIN_REQUEST:
      state = {
        ...state,
        authenticating: true,
        error: null,
      };
      break;
    case authConstants.LOGIN_SUCCESS:
      state = {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        authenticate: true,
        authenticating: false,
        error: null,
      };
      break;
    case authConstants.LOGIN_FAILURE:
    case authConstants.SIGNUP_FAILURE:
      state = {
        ...state,
        authenticating: false,
        error: action.payload?.error || "Sign in failed. Please try again.",
      };
      break;
    case authConstants.LOGOUT_REQUEST:
      state = {
        ...state,
        loading: true,
      };
      break;
    case authConstants.LOGOUT_SUCCESS:
      state = {
        ...initState,
      };
      break;
    case authConstants.LOGOUT_FAILURE:
      state = {
        ...state,
        error: action.payload.error,
        loading: false,
      };
      break;
    case authConstants.SIGNUP_REQUEST:
      state = { ...state, authenticating: true, error: null };
      break;
    case authConstants.SIGNUP_SUCCESS:
      state = { ...state, authenticating: false, error: null };
      break;
  }

  return state;
};
