import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { tokenHasExpired } from '../../actions/auth.actions';
import { useSelector } from 'react-redux';

const PrivateRoute = ({ component: Component, allowedRoles, ...rest }) => {
    const user = useSelector((state) => state.auth.user);
    return <Route {...rest} render={(props) => {
        const token = window.localStorage.getItem('token');
        if(token && !tokenHasExpired(token)){
            let storedUser = user;
            if (!storedUser?.role) {
                try {
                    storedUser = JSON.parse(window.localStorage.getItem('user') || 'null');
                } catch {
                    storedUser = null;
                }
            }
            if (allowedRoles?.length && !allowedRoles.includes(storedUser?.role)) {
                return <Redirect to={'/'} />;
            }
            return <Component {...props} />
        }else{
            window.localStorage.removeItem('token');
            window.localStorage.removeItem('user');
            return <Redirect to={'/signin'} />
        }
    }} />
}

export default PrivateRoute;
