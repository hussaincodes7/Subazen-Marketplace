import { initialDataConstants, productConstants } from "../actions/constants";

const initState = {
    products: [],
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
    return {
        ...state,
        ...changes,
        pendingRequests,
        loading: pendingRequests > 0
    };
};

const mergeProducts = (currentProducts, incomingProducts) => {
    if (!Array.isArray(incomingProducts)) {
        return currentProducts;
    }

    const currentById = new Map(currentProducts.map((product) => [String(product._id), product]));
    const incomingIds = new Set(incomingProducts.map((product) => String(product._id)));
    return [
        ...incomingProducts.map((product) => ({
            ...currentById.get(String(product._id)),
            ...product
        })),
        ...currentProducts.filter((product) => !incomingIds.has(String(product._id)))
    ];
};

const productReducer = (state = initState, action) => {
    switch (action.type) {
        case productConstants.CLEAR_PRODUCT_ERROR:
            return { ...state, error: null };

        case productConstants.ADD_NEW_PRODUCT_REQUEST:
        case productConstants.UPDATE_PRODUCT_REQUEST:
        case productConstants.DELETE_PRODUCT_REQUEST:
        case initialDataConstants.GET_ALL_INITIAL_DATA_REQUEST:
            return startRequest(state);

        case productConstants.ADD_NEW_PRODUCT_SUCCESS: {
            const product = action.payload?.product;
            return finishRequest(state, product ? {
                products: state.products.some((item) => String(item._id) === String(product._id))
                    ? state.products.map((item) => String(item._id) === String(product._id) ? { ...item, ...product } : item)
                    : [...state.products, product]
            } : {});
        }

        case productConstants.UPDATE_PRODUCT_SUCCESS: {
            const product = action.payload?.product;
            return finishRequest(state, product ? {
                products: state.products.map((item) => String(item._id) === String(product._id) ? { ...item, ...product } : item)
            } : {});
        }

        case productConstants.DELETE_PRODUCT_SUCCESS:
            return finishRequest(state, {
                products: state.products.filter((item) => String(item._id) !== String(action.payload?.productId))
            });

        case initialDataConstants.GET_ALL_INITIAL_DATA_SUCCESS:
            return finishRequest(state, {
                products: mergeProducts(state.products, action.payload?.products)
            });

        case productConstants.ADD_NEW_PRODUCT_FAILURE:
        case productConstants.UPDATE_PRODUCT_FAILURE:
        case productConstants.DELETE_PRODUCT_FAILURE:
        case initialDataConstants.GET_ALL_INITIAL_DATA_FAILURE:
            return finishRequest(state, {
                error: action.payload?.error || "The product request failed."
            });

        default:
            return state;
    }
};

export default productReducer;
