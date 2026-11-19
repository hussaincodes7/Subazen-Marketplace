import { authConstants } from "../actions/constants";

const initState = {
  token: null,
  user: {
    firstName: "",
    lastName: "",
    email: "",
        profilePicture: "",
        role: "",
  },
  authenticate: false,
  authenticating: false,
  message: "",
  error: null,
  loading: false,
};

const authReducer = (state = initState, action) => {
  switch (action.type) {
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
      state = {
        ...state,
        token: null,
        authenticate: false,
        authenticating: false,
        error: action.payload?.error || 'Sign-in failed.',
      };
      break;

    case authConstants.LOGOUT_REQUEST:
      state = {
        ...state,
        loading: true,
        error: null,
      };
      break;
    case authConstants.LOGOUT_SUCCESS:
      state = {
        ...initState,
      };
      break;
    case authConstants.LOGOUT_FAILURE:
      state = {
        ...initState,
        error: action.payload?.error || 'Sign-out failed.',
        loading: false
      };
      break;

    default:
      return state;
  }

  return state;
};

export default authReducer;
