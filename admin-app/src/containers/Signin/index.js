import React, { useState } from "react";
import Layout from "../../components/Layout";
import { Container, Form, Row, Col, Button, Alert } from "react-bootstrap";
import Input from "../../components/UI/Input";
import { login, tokenHasExpired } from "../../actions/auth.actions";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import { generatePublicUrl } from "../../urlConfig";

const Signin = (props) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const auth = useSelector((state) => state.auth);

  const dispatch = useDispatch();

  const userLogin = async (e) => {
    e.preventDefault();
    const user = {
      email,
      password,
    };

    await dispatch(login(user));
  };

  if (auth.authenticate && !tokenHasExpired(localStorage.getItem("token") || "")) {
    return <Redirect to={`/`} />;
  }

  return (
    <Layout>
      <Container fluid className="auth-page">
        <Row className="justify-content-center w-100">
          <Col xs={12} sm={10} md={7} lg={5} xl={4}>
            <section className="auth-card">
              <div className="auth-card-heading">
                <img className="auth-logo" src={generatePublicUrl("subazen-marketplace-logo.png")} alt="Subazen Online Marketplace" />
                <span className="auth-eyebrow">ADMIN PANEL</span>
                <h1>Welcome back</h1>
                <p>Sign in to manage your store.</p>
              </div>
              <Form onSubmit={userLogin}>
              <Input
                label="Email address"
                placeholder="Enter email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {auth.error && <Alert variant="danger" className="auth-alert">{auth.error}</Alert>}

              <Input
                label="Password"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                variant="primary"
                type="submit"
                disabled={auth.authenticating}
                className="auth-submit"
              >
                {auth.authenticating ? "Signing in..." : "Sign in"}
              </Button>
            </Form>
            </section>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default Signin;
