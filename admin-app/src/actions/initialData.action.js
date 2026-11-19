import { initialDataConstants, categoryConstants } from "./constants";
import axios, { getApiErrorMessage } from "../helpers/axios";
export const getInitialData = () => {
    return async dispatch => {
        dispatch({ type: initialDataConstants.GET_ALL_INITIAL_DATA_REQUEST });
        dispatch({ type: categoryConstants.GET_ALL_CATEGORIES_REQUEST });
        try {
            const res = await axios.post('/initialdata', {});
            const { categories, products } = res.data || {};
            if (!Array.isArray(categories) || !Array.isArray(products)) {
                throw new Error('The server returned invalid dashboard data.');
            }
            dispatch({
                type: categoryConstants.GET_ALL_CATEGORIES_SUCCESS,
                payload: { categories }
            });
            dispatch({
                type: initialDataConstants.GET_ALL_INITIAL_DATA_SUCCESS,
                payload: { products }
            });
            return true;
        } catch (error) {
            dispatch({
                type: categoryConstants.GET_ALL_CATEGORIES_FAILURE,
                payload: { error: getApiErrorMessage(error, 'Could not load categories.') }
            });
            dispatch({
                type: initialDataConstants.GET_ALL_INITIAL_DATA_FAILURE,
                payload: { error: getApiErrorMessage(error, 'Could not load the dashboard data.') }
            });
            return false;
        }
    }
}
