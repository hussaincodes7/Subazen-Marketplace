import axios, { getApiErrorMessage } from "../helpers/axios";
import { categoryConstants } from "./constants";

export const clearCategoryError = () => ({
    type: categoryConstants.CLEAR_CATEGORY_ERROR
});

export const getAllCategory = () => {
    return async dispatch => {
        dispatch({ type: categoryConstants.GET_ALL_CATEGORIES_REQUEST });
        try {
            const res = await axios.get(`category/getcategory`);
            const categoryList = res.data?.categoryList;
            if (!Array.isArray(categoryList)) {
                throw new Error('The server returned an invalid category list.');
            }
            dispatch({
                type: categoryConstants.GET_ALL_CATEGORIES_SUCCESS,
                payload: { categories: categoryList || [] }
            });
            return true;
        } catch (error) {
            dispatch({
                type: categoryConstants.GET_ALL_CATEGORIES_FAILURE,
                payload: { error: getApiErrorMessage(error, 'Could not load categories.') }
            });
            return false;
        }
    }
}
export const addCategory = (form) => {
    return async dispatch => {
        dispatch({ type: categoryConstants.ADD_NEW_CATEGORY_REQUEST });
        try {
            const res = await axios.post(`/category/create`, form);
            if (!res.data?.category?._id) {
                throw new Error('The server did not return the new category.');
            }
            dispatch({
                type: categoryConstants.ADD_NEW_CATEGORY_SUCCESS,
                payload: { category: res.data.category }
            });
            return true;
        } catch (error) {
            dispatch({
                type: categoryConstants.ADD_NEW_CATEGORY_FAILURE,
                payload: { error: getApiErrorMessage(error, 'Could not add the category.') }
            });
            return false;
        }
    }
}

export const updateCategory = (categoryId, form) => {
    return async dispatch => {
        dispatch({ type: categoryConstants.UPDATE_CATEGORY_REQUEST });
        try {
            const res = await axios.put(`/category/${categoryId}`, form);
            if (!res.data?.category?._id) {
                throw new Error('The server did not return the updated category.');
            }
            dispatch({
                type: categoryConstants.UPDATE_CATEGORY_SUCCESS,
                payload: { category: res.data.category }
            });
            return true;
        } catch (error) {
            dispatch({
                type: categoryConstants.UPDATE_CATEGORY_FAILURE,
                payload: { error: getApiErrorMessage(error, 'Could not update the category.') }
            });
            return false;
        }
    }
}

export const deleteCategories = (categoryIds) => {
    return async dispatch => {
        dispatch({ type: categoryConstants.DELETE_CATEGORIES_REQUEST });
        try {
            if (!Array.isArray(categoryIds) || !categoryIds.length) {
                throw new Error('Select at least one category to delete.');
            }
            await axios.delete('/category', { data: { categoryIds } });
            dispatch({
                type: categoryConstants.DELETE_CATEGORIES_SUCCESS,
                payload: { categoryIds: categoryIds.map(String) }
            });
            return true;
        } catch (error) {
            dispatch({
                type: categoryConstants.DELETE_CATEGORIES_FAILURE,
                payload: { error: getApiErrorMessage(error, 'Could not delete the selected categories.') }
            });
            return false;
        }
    }
}
