import React, { useEffect, useState } from 'react';
import './style.css';
import { useSelector, useDispatch } from 'react-redux';
import { getAllCategory } from '../../actions';
import { Link } from 'react-router-dom';
import { getCategoryIcon } from '../../utils/categoryIcons';

/**
* @author
* @function MenuHeader
**/

const MenuHeader = (props) => {
  const [scrolled, setScrolled] = useState(false);

  const category = useSelector(state => state.category);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAllCategory());
  }, []);

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);


  const renderCategories = (categories, parentSlugs = [], depth = 0) => categories.filter((item) => item.isActive !== false).map((item) => {
    const path = [...parentSlugs, item.slug].filter(Boolean);
    const Icon = getCategoryIcon(item);
    return <li className={`menu-category-depth-${depth}`} key={item._id || item.slug}>
      <Link className={depth === 0 ? "menu-category-main-link" : "menu-category-link"} to={`/collections/${path.join("/")}`}>
        {depth === 0 && <span className="menu-category-icon-clip"><Icon className="menu-category-icon" aria-hidden="true" /></span>}
        <span>{item.name}</span>{depth === 0 && item.children?.length > 0 && <span className="menu-category-caret" aria-hidden="true">⌄</span>}
      </Link>
      {item.children?.length > 0 && <ul>{renderCategories(item.children, path, depth + 1)}</ul>}
    </li>;
  });
  return (
    <nav className={`menuHeader${scrolled ? ' is-scrolled' : ''}`} aria-label="Shop by category">
      <ul className="menuHeader-root" id="menuHeader-root">
        {category.categories.length > 0 ? renderCategories(category.categories.filter((item) => item.parentId == null && item.type === "product"), [], 0) : null}
      </ul>
    </nav>
  )

}

export default MenuHeader
