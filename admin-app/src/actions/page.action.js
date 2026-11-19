import axios from "../helpers/axios";
import { pageConstants } from "./constants";

export const createPage = (form) => {
    return async dispatch => {
        dispatch({ type: pageConstants.CREATE_PAGE_REQUEST });
        try{
            const res = await axios.post('/admin/page/create', form);
            if(res.status === 201){
                dispatch({
                    type: pageConstants.CREATE_PAGE_SUCCESS,
                    payload: { page: res.data.page }
                });
            }else{
                dispatch({
                    type: pageConstants.CREATE_PAGE_FAILURE,
                    payload: { error: res.data.message || res.data.error }
                });
            }
        }catch(error){
            dispatch({
                type: pageConstants.CREATE_PAGE_FAILURE,
                payload: { error: error.response?.data?.message || error.response?.data?.error || error.message }
            });
        }
    }
}
