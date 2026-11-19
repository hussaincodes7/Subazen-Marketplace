import React from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { NavLink, Link, useHistory } from "react-router-dom";
import { useSelector, useDispatch} from "react-redux";
import { signout } from "../../actions/auth.actions";
import OrderNotifications from "../OrderNotifications";
import { generatePublicUrl } from "../../urlConfig";
import "./style.css";

/**
 * @author
 * @function Header
 **/

const Header = (props) => {
  const auth = useSelector(state => state.auth);
const dispatch = useDispatch();
const history = useHistory();

const logout = (event) => {
    event.preventDefault();
    dispatch(signout());
    history.replace('/signin');
}
  
  const renderLoggedInLinks = () => {
    return (
      <Nav>
        {auth.user?.role === "admin" && <li className="nav-item admin-order-notifications-nav-item"><OrderNotifications /></li>}
        <li className="nav-item">
          <NavLink to="/profile" className="nav-link admin-profile-link">
            {auth.user?.profilePicture
              ? <img className="admin-header-avatar" src={generatePublicUrl(auth.user.profilePicture)} alt="" />
              : <span className="admin-header-avatar admin-header-initials">{auth.user?.firstName?.[0] || "A"}</span>}
            <span>Profile</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <button type="button" className="nav-link admin-signout-button" onClick={logout}>Sign out</button>
        </li>
      </Nav>
    );
  }

  const renderNonLoggedInLinks = () => {
    return (
      <Nav>
        {/* <Nav.Link href="#deets">Signin</Nav.Link> */}
        <li className="nav-item">
          <NavLink to="/signin" className="nav-link">Signin</NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/signup" className="nav-link">Signup</NavLink>
        </li>
      </Nav>
    );
  }

  return (
    <Navbar
      collapseOnSelect
      sticky="top"
      expand="lg"
      bg="dark"
      variant="dark"
      style={{ zIndex: 40 }}
    >
      <Container fluid>
        <Link className="navbar-brand" to="/">
          <span>Subazen Admin Panel</span>
        </Link>
        <div className="admin-header-controls">
          <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        </div>
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            {/*<Nav.Link href="#features">Features</Nav.Link>
        <Nav.Link href="#pricing">Pricing</Nav.Link>
        <NavDropdown title="Dropdown" id="collasible-nav-dropdown">
          <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
          <NavDropdown.Item href="#action/3.2">Another action</NavDropdown.Item>
          <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item href="#action/3.4">Separated link</NavDropdown.Item>
        </NavDropdown>//*/}
          </Nav>
          {auth.authenticate ? renderLoggedInLinks() : renderNonLoggedInLinks()}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
