import authReducer from './auth.reducers';
import { combineReducers } from 'redux';
import  userReducer  from './user.reducers';
import productReducer from './product.reducer';
import orderReducer from './order.reducer';
import categoryReducer from './category.reducer';
import pageReducer from './page.reducer';
import adminReducer from './admin.reducer';

const reducers = {
    auth: authReducer,
    user: userReducer,
    product: productReducer,
    category: categoryReducer,
    page: pageReducer,
    admin: adminReducer
};

if (typeof orderReducer === 'function') {
    reducers.order = orderReducer;
}

const rootReducer = combineReducers(reducers);

export default rootReducer;
