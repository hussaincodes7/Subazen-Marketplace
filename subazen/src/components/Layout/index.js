import React from 'react';
import Header from '../Header';
import MenuHeader from '../MenuHeader';
import Footer from '../Footer';
import './style.css';

/**
* @author
* @function Layout
**/

const Layout = (props) => {
  return(
    <div className={`site-shell${props.hideCategoryNav ? ' site-shell-no-category-nav' : ''}`}>
        <Header />
        {!props.hideCategoryNav && <MenuHeader />}
        <div className="site-main">
          {props.children}
        </div>
        <Footer />
    </div>
   )

 }

export default Layout
