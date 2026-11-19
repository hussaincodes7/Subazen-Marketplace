import { categoryConstants } from "../actions/constants";

const initState = {
    categories: [],
    loaded: false,
    loading: false,
    pendingRequests: 0,
    error: null
};

const startRequest = (state) => ({
    ...state,
    pendingRequests: state.pendingRequests + 1,
    loading: true,
    error: null
});

const finishRequest = (state, changes = {}) => {
    const pendingRequests = Math.max(0, state.pendingRequests - 1);
    return {
        ...state,
        ...changes,
        pendingRequests,
        loading: pendingRequests > 0
    };
};

const flattenCategories = (categories) => categories.flatMap(({ children = [], ...category }) => [
    category,
    ...flattenCategories(children)
]);

const buildCategoryTree = (categories) => {
    const categoryList = categories.map((category) => ({ ...category, children: [] }));
    const categoriesById = new Map(categoryList.map((category) => [String(category._id), category]));
    const rootCategories = [];

    for (const category of categoryList) {
        const parent = category.parentId
            ? categoriesById.get(String(category.parentId))
            : null;

        if (parent && parent !== category) {
            parent.children.push(category);
        } else {
            rootCategories.push(category);
        }
    }

    return rootCategories;
};

const categoryReducer = (state = initState, action) => {
    switch (action.type) {
        case categoryConstants.CLEAR_CATEGORY_ERROR:
            return {
                ...state,
                error: null
            };

        case categoryConstants.GET_ALL_CATEGORIES_REQUEST:
        case categoryConstants.ADD_NEW_CATEGORY_REQUEST:
        case categoryConstants.UPDATE_CATEGORY_REQUEST:
        case categoryConstants.DELETE_CATEGORIES_REQUEST:
            return startRequest(state);

        case categoryConstants.GET_ALL_CATEGORIES_SUCCESS:
            return finishRequest(state, {
                categories: Array.isArray(action.payload?.categories) ? action.payload.categories : state.categories,
                loaded: true
            });

        case categoryConstants.ADD_NEW_CATEGORY_SUCCESS: {
            const newCategory = action.payload?.category;
            return finishRequest(state, newCategory ? {
                categories: buildCategoryTree([
                    ...flattenCategories(state.categories),
                    newCategory
                ]),
                loaded: true
            } : {});
        }

        case categoryConstants.UPDATE_CATEGORY_SUCCESS: {
            const updatedCategory = action.payload?.category;
            if (!updatedCategory?._id) {
                return finishRequest(state);
            }
            return finishRequest(state, {
                categories: buildCategoryTree(
                    flattenCategories(state.categories).map((category) => (
                        String(category._id) === String(updatedCategory._id)
                            ? { ...category, ...updatedCategory }
                            : category
                    ))
                ),
                loaded: true
            });
        }

        case categoryConstants.DELETE_CATEGORIES_SUCCESS: {
            const deletedIds = new Set((action.payload?.categoryIds || []).map(String));
            return finishRequest(state, {
                categories: buildCategoryTree(
                    flattenCategories(state.categories).filter(
                        (category) => !deletedIds.has(String(category._id))
                    )
                ),
                loaded: true
            });
        }

        case categoryConstants.GET_ALL_CATEGORIES_FAILURE:
        case categoryConstants.ADD_NEW_CATEGORY_FAILURE:
        case categoryConstants.UPDATE_CATEGORY_FAILURE:
        case categoryConstants.DELETE_CATEGORIES_FAILURE:
            return finishRequest(state, {
                error: action.payload?.error || 'The category request failed.'
            });

        default:
            return state;
    }
};

export default categoryReducer;
