import { userConstants } from '../actions/constants';

const initState = {
    error: null,
    message: '',
    loading: false,
};

const userReducer = (state = initState, action) => {
    switch (action.type) {
        case userConstants.USER_REGISTER_REQUEST:
            return {
                ...state,
                loading: true,
                error: null,
                message: ''
            };

        case userConstants.USER_REGISTER_SUCCESS:
            return {
                ...state,
                loading: false,
                error: null,
                message: action.payload?.message || 'Admin account created successfully'
            };

        case userConstants.USER_REGISTER_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload?.error || 'Admin signup failed.'
            };

        default:
            return state;
    }
};

export default userReducer;
