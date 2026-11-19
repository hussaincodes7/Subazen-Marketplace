import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Layout from '../../components/Layout';
import { generatePublicUrl } from '../../urlConfig';
import { approveJuniorAdmin, getAdminProfile, getPendingAdmins, updateAdminProfile } from '../../actions/admin.action';
import './style.css';

const AdminProfile = () => {
    const dispatch = useDispatch();
    const auth = useSelector((state) => state.auth);
    const adminState = useSelector((state) => state.admin);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [profilePicture, setProfilePicture] = useState(null);
    const [message, setMessage] = useState('');
    const [profileError, setProfileError] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [approvingId, setApprovingId] = useState('');
    const preview = useMemo(
        () => profilePicture ? URL.createObjectURL(profilePicture) : generatePublicUrl(auth.user?.profilePicture || ''),
        [profilePicture, auth.user?.profilePicture]
    );

    useEffect(() => {
        dispatch(getAdminProfile());
    }, [dispatch]);

    useEffect(() => {
        if (auth.user?.role === 'admin' && !adminState.pendingAdminsLoaded) {
            dispatch(getPendingAdmins());
        }
    }, [adminState.pendingAdminsLoaded, auth.user?.role, dispatch]);

    useEffect(() => () => {
        if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    }, [preview]);

    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setProfileError('');
        if ((currentPassword || newPassword) && (!currentPassword || newPassword.length < 6)) {
            setProfileError('Enter your current password and a new password with at least 6 characters.');
            return;
        }

        const form = new FormData();
        if (profilePicture) form.append('profilePicture', profilePicture);
        if (currentPassword || newPassword) {
            form.append('currentPassword', currentPassword);
            form.append('newPassword', newPassword);
        }
        if (!profilePicture && !currentPassword && !newPassword) {
            setProfileError('Choose a profile photo or enter a new password.');
            return;
        }

        setSavingProfile(true);
        const result = await dispatch(updateAdminProfile(form));
        setSavingProfile(false);
        if (result?.error) {
            setProfileError(result.error);
            return;
        }
        setCurrentPassword('');
        setNewPassword('');
        setProfilePicture(null);
        setMessage('Your profile was updated successfully.');
    };

    const handleApprove = async (userId) => {
        setMessage('');
        setApprovingId(String(userId));
        const result = await dispatch(approveJuniorAdmin(userId));
        setApprovingId('');
        if (result) setMessage('Admin approved with the Junior Admin role.');
    };

    return (
        <Layout sidebar>
            <Container fluid className="admin-profile-page">
                <header className="admin-profile-heading">
                    <div>
                        <span className="admin-profile-eyebrow">ACCOUNT</span>
                        <h1>Admin profile</h1>
                        <p>Update your profile photo or change your password.</p>
                    </div>
                </header>

                {message && <Alert variant="success" dismissible onClose={() => setMessage('')}>{message}</Alert>}

                <Row className="g-4">
                    <Col xs={12} xl={7}>
                        <Card className="admin-profile-card">
                            <Card.Body>
                                <div className="admin-profile-summary">
                                    {preview ? <img src={preview} alt="Admin profile" /> : <span className="admin-profile-avatar-fallback">{auth.user?.firstName?.[0] || 'A'}</span>}
                                    <div>
                                        <h2>{auth.user?.fullName || `${auth.user?.firstName || ''} ${auth.user?.lastName || ''}`.trim()}</h2>
                                        <p>{auth.user?.email}</p>
                                        <Badge bg={auth.user?.role === 'admin' ? 'primary' : 'secondary'}>{auth.user?.role === 'admin' ? 'Full Admin' : 'Junior Admin'}</Badge>
                                    </div>
                                </div>

                                <Form onSubmit={handleProfileSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Profile photo</Form.Label>
                                        <Form.Control type="file" accept="image/*" onChange={(event) => setProfilePicture(event.target.files?.[0] || null)} />
                                    </Form.Group>
                                    <hr />
                                    <h3>Change password</h3>
                                    <p className="text-muted small">Leave both password fields empty if you only want to change your photo.</p>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Current password</Form.Label>
                                        <InputGroup>
                                            <Form.Control type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} placeholder="Enter current password" autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} />
                                            <Button type="button" variant="outline-secondary" aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'} onClick={() => setShowCurrentPassword((visible) => !visible)}>
                                                {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                                            </Button>
                                        </InputGroup>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>New password</Form.Label>
                                        <InputGroup>
                                            <Form.Control type={showNewPassword ? 'text' : 'password'} value={newPassword} placeholder="At least 6 characters" autoComplete="new-password" onChange={(event) => setNewPassword(event.target.value)} />
                                            <Button type="button" variant="outline-secondary" aria-label={showNewPassword ? 'Hide new password' : 'Show new password'} onClick={() => setShowNewPassword((visible) => !visible)}>
                                                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                                            </Button>
                                        </InputGroup>
                                    </Form.Group>
                                    {profileError && <Alert variant="danger">{profileError}</Alert>}
                                    <Button type="submit" disabled={savingProfile}>
                                        {savingProfile && <Spinner size="sm" className="me-2" />}
                                        {savingProfile ? 'Saving…' : 'Save profile'}
                                    </Button>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>

                    {auth.user?.role === 'admin' && (
                        <Col xs={12} xl={5}>
                            <Card className="admin-profile-card admin-approval-card">
                                <Card.Body>
                                    <div className="admin-approval-heading">
                                        <div>
                                            <h2>Admin signups</h2>
                                            <p>Approve new admins to give them Junior Admin access.</p>
                                        </div>
                                        <Badge bg="light" text="dark" pill>{adminState.pendingAdmins.length} waiting</Badge>
                                    </div>
                                    {adminState.error && <Alert variant="danger">{adminState.error}</Alert>}
                                    {adminState.loading && !adminState.pendingAdmins.length ? (
                                        <div className="admin-approval-empty">Loading requests…</div>
                                    ) : adminState.pendingAdmins.length ? (
                                        <div className="admin-approval-list">
                                            {adminState.pendingAdmins.map((pendingAdmin) => (
                                                <div className="admin-approval-item" key={pendingAdmin._id}>
                                                    <div className="admin-approval-person">
                                                        <strong>{pendingAdmin.firstName} {pendingAdmin.lastName}</strong>
                                                        <span>{pendingAdmin.email}</span>
                                                    </div>
                                                    <Button size="sm" onClick={() => handleApprove(pendingAdmin._id)} disabled={adminState.loading || approvingId === String(pendingAdmin._id)}>
                                                        {approvingId === String(pendingAdmin._id) ? 'Approving…' : 'Approve as Junior Admin'}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="admin-approval-empty">No admin signups are waiting for approval.</div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    )}
                </Row>
            </Container>
        </Layout>
    );
};

export default AdminProfile;
