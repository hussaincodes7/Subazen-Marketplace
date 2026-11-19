import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { Alert, Container, Form, Row, Col, Button } from 'react-bootstrap';
import Input from '../../components/UI/Input';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { signup } from '../../actions/user.actions';
import { generatePublicUrl } from '../../urlConfig';

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useSelector((state) => state.auth);
  const registration = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const userSignup = (event) => {
    event.preventDefault();
    dispatch(signup({ firstName, lastName, email, password }));
  };

  if (auth.authenticate) {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <Container fluid className="auth-page">
        <Row className="justify-content-center w-100">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <section className="auth-card">
              <div className="auth-card-heading">
                <img className="auth-logo" src={generatePublicUrl('subazen-marketplace-logo.png')} alt="Subazen Online Marketplace" />
                <span className="auth-eyebrow">ADMIN PANEL</span>
                <h1>Create an admin account</h1>
                <p>The first account becomes Full Admin. Later signups need approval and receive Junior Admin access.</p>
              </div>
              {registration.loading && <Alert variant="info" className="auth-alert">Creating your account…</Alert>}
              {registration.message && <Alert variant="success" className="auth-alert">{registration.message}</Alert>}
              {registration.error && <Alert variant="danger" className="auth-alert">{registration.error}</Alert>}
              <Form onSubmit={userSignup}>
              <Row>
                <Col md={6}>
                  <Input
                    label="First Name"
                    placeholder="First Name"
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Input
                    label="Last Name"
                    placeholder="Last Name"
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </Col>
              </Row>

              <Input
                label="Email address"
                placeholder="Enter email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <Input
                label="Password"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              {!registration.loading && (
                <Button variant="primary" type="submit" className="auth-submit">
                  Create account
                </Button>
              )}
            </Form>
            </section>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
}
