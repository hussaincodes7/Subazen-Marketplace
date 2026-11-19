import axios, { getApiErrorMessage } from '../helpers/axios';
import { adminConstants, authConstants } from './constants';

export const getAdminProfile = () => async (dispatch) => {
    try {
        const res = await axios.get('/admin/profile');
        const user = res.data?.user;
        const token = localStorage.getItem('token');
        if (!user || !token) return false;
        localStorage.setItem('user', JSON.stringify(user));
        dispatch({ type: authConstants.LOGIN_SUCCESS, payload: { user, token } });
        return user;
    } catch {
        return false;
    }
};

export const getPendingAdmins = () => async (dispatch) => {
    dispatch({ type: adminConstants.GET_PENDING_ADMINS_REQUEST });
    try {
        const res = await axios.get('/admin/pending-signups');
        dispatch({
            type: adminConstants.GET_PENDING_ADMINS_SUCCESS,
            payload: { admins: Array.isArray(res.data?.users) ? res.data.users : [] }
        });
        return true;
    } catch (error) {
        dispatch({
            type: adminConstants.GET_PENDING_ADMINS_FAILURE,
            payload: { error: getApiErrorMessage(error, 'Could not load pending admin signups.') }
        });
        return false;
    }
};

export const approveJuniorAdmin = (userId) => async (dispatch) => {
    dispatch({ type: adminConstants.APPROVE_JUNIOR_ADMIN_REQUEST });
    try {
        const res = await axios.patch(`/admin/pending-signups/${userId}/approve`);
        dispatch({ type: adminConstants.APPROVE_JUNIOR_ADMIN_SUCCESS, payload: { userId } });
        return res.data?.user || true;
    } catch (error) {
        dispatch({
            type: adminConstants.APPROVE_JUNIOR_ADMIN_FAILURE,
            payload: { error: getApiErrorMessage(error, 'Could not approve this admin.') }
        });
        return false;
    }
};

export const updateAdminProfile = (form) => async (dispatch) => {
    try {
        const res = await axios.put('/admin/profile', form);
        const user = res.data?.user;
        const token = localStorage.getItem('token');
        if (!user || !token) {
            throw new Error('The server returned an invalid profile response.');
        }
        localStorage.setItem('user', JSON.stringify(user));
        dispatch({ type: authConstants.LOGIN_SUCCESS, payload: { user, token } });
        return user;
    } catch (error) {
        return { error: getApiErrorMessage(error, 'Could not update your profile.') };
    }
};
