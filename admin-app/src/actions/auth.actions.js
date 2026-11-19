import { authConstants } from './constants';
import axios, { getApiErrorMessage } from '../helpers/axios';

export const getTokenExpiration = (token) => {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) {
      return null;
    }
    const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=');
    const { exp } = JSON.parse(window.atob(paddedPayload));
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
};

export const tokenHasExpired = (token) => {
  const expiresAt = getTokenExpiration(token);
  return !expiresAt || expiresAt <= Date.now();
};

export const login = (user) => {
  return async (dispatch) => {
    dispatch({ type: authConstants.LOGIN_REQUEST });

    try {
      const res = await axios.post('/admin/signin', user);
      const { token, user: signedInUser } = res.data || {};
      if (!token || !signedInUser || tokenHasExpired(token)) {
        throw new Error('The server returned an invalid sign-in response.');
      }
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(signedInUser));
      dispatch({
        type: authConstants.LOGIN_SUCCESS,
        payload: { token, user: signedInUser },
      });
      return true;
    } catch (error) {
      dispatch({
        type: authConstants.LOGIN_FAILURE,
        payload: {
          error: error.message === 'The server returned an invalid sign-in response.'
            ? error.message
            : getApiErrorMessage(error, 'Sign-in failed.'),
        },
      });
      return false;
    }
  };
};

export const isUserLoggedIn = () => {
  return async (dispatch) => {
    const token = localStorage.getItem('token');
    if (token && !tokenHasExpired(token)) {
      let user;
      try {
        user = JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        user = null;
      }
      if (!user || typeof user !== 'object') {
        localStorage.removeItem('token');
        dispatch({ type: authConstants.LOGOUT_SUCCESS });
        return;
      }
      dispatch({
        type: authConstants.LOGIN_SUCCESS,
        payload: { token, user },
      });
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: authConstants.LOGOUT_SUCCESS });
    }
  };
};

export const signout = () => {
  return (dispatch) => {
    const token = localStorage.getItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: authConstants.LOGOUT_SUCCESS });

    if (token) {
      axios.post('/admin/signout', {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      }).catch(() => {
        // Local signout is complete even if the server session cannot be reached.
      });
    }
  };
};
