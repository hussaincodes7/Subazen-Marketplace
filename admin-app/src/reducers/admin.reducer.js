import { adminConstants } from '../actions/constants';

const initState = {
    pendingAdmins: [],
    pendingAdminsLoaded: false,
    loading: false,
    pendingRequests: 0,
    error: null
};

const startRequest = (state) => ({
    ...state,
    loading: true,
    pendingRequests: state.pendingRequests + 1,
    error: null
});

const finishRequest = (state, changes = {}) => {
    const pendingRequests = Math.max(0, state.pendingRequests - 1);
    return { ...state, ...changes, pendingRequests, loading: pendingRequests > 0 };
};

const adminReducer = (state = initState, action) => {
    switch (action.type) {
        case adminConstants.GET_PENDING_ADMINS_REQUEST:
        case adminConstants.APPROVE_JUNIOR_ADMIN_REQUEST:
            return startRequest(state);
        case adminConstants.GET_PENDING_ADMINS_SUCCESS:
            return finishRequest(state, { pendingAdmins: action.payload?.admins || [], pendingAdminsLoaded: true });
        case adminConstants.APPROVE_JUNIOR_ADMIN_SUCCESS:
            return finishRequest(state, {
                pendingAdmins: state.pendingAdmins.filter((user) => String(user._id) !== String(action.payload?.userId))
            });
        case adminConstants.GET_PENDING_ADMINS_FAILURE:
        case adminConstants.APPROVE_JUNIOR_ADMIN_FAILURE:
            return finishRequest(state, { error: action.payload?.error || 'The admin request failed.' });
        default:
            return state;
    }
};

export default adminReducer;
