import React, { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Container, Form, Spinner } from "react-bootstrap";
import Layout from "../components/Layout";
import axios, { getApiErrorMessage } from "../helpers/axios";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadReviews = () => {
    setLoading(true);
    axios.get("/admin/reviews")
      .then((response) => setReviews(response.data?.reviews || []))
      .catch((requestError) => setError(getApiErrorMessage(requestError, "Could not load reviews.")))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadReviews(); }, []);

  const changeStatus = async (review, status) => {
    setError(""); setMessage(""); setBusyId(String(review._id));
    try {
      const response = await axios.patch(`/admin/reviews/${review._id}`, { status });
      setReviews((items) => items.map((item) => item._id === review._id ? { ...item, status: response.data.review.status } : item));
      setMessage("Review status updated.");
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Could not update this review.")); }
    finally { setBusyId(""); }
  };

  const deleteReview = async (review) => {
    if (!window.confirm("Permanently delete this review?")) return;
    setError(""); setMessage(""); setBusyId(String(review._id));
    try {
      await axios.delete(`/admin/reviews/${review._id}`);
      setReviews((items) => items.filter((item) => item._id !== review._id));
      setMessage("Review deleted.");
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Could not delete this review.")); }
    finally { setBusyId(""); }
  };

  const visibleReviews = filter === "all" ? reviews : reviews.filter((review) => review.status === filter);
  return <Layout sidebar><Container fluid className="py-3">
    <header className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3"><div><h1 className="h3 mb-1">Customer reviews</h1><p className="text-muted mb-0">Approve reviews before they appear on product pages.</p></div><Form.Select aria-label="Filter reviews" value={filter} onChange={(event) => setFilter(event.target.value)} style={{ maxWidth: 200 }}><option value="all">All reviews</option>{["pending", "approved", "rejected", "hidden"].map((status) => <option value={status} key={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</Form.Select></header>
    {error && <Alert variant="danger" role="alert">{error}</Alert>}{message && <Alert variant="success" role="status">{message}</Alert>}
    {loading ? <div><Spinner size="sm" /> Loading reviews…</div> : visibleReviews.length ? <div className="d-grid gap-3">
      {visibleReviews.map((review) => <Card key={review._id}><Card.Body>
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2"><div><strong>{review.product?.name || "Product removed"}</strong> <span className="text-warning">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><Badge bg={{ pending: "warning", approved: "success", rejected: "danger", hidden: "secondary" }[review.status]}>{review.status}</Badge></div>
        <div className="text-muted small">By {review.user ? `${review.user.firstName} ${review.user.lastName}` : "Customer"} · {review.user?.email || ""} · {new Date(review.createdAt).toLocaleDateString("en-PK")}{review.verifiedPurchase && " · Verified purchase"}</div>
        {review.title && <h2 className="h6 mt-3 mb-1">{review.title}</h2>}<p className="mb-3" style={{ whiteSpace: "pre-wrap" }}>{review.body}</p>
        <div className="d-flex flex-wrap gap-2">{review.status !== "approved" && <Button size="sm" onClick={() => changeStatus(review, "approved")} disabled={busyId === review._id}>Approve & publish</Button>}{review.status !== "rejected" && <Button size="sm" variant="outline-danger" onClick={() => changeStatus(review, "rejected")} disabled={busyId === review._id}>Reject</Button>}{review.status === "approved" && <Button size="sm" variant="outline-secondary" onClick={() => changeStatus(review, "hidden")} disabled={busyId === review._id}>Hide</Button>}{review.status === "hidden" && <Button size="sm" variant="outline-primary" onClick={() => changeStatus(review, "approved")} disabled={busyId === review._id}>Publish</Button>}<Button size="sm" variant="outline-dark" onClick={() => deleteReview(review)} disabled={busyId === review._id}>Delete</Button></div>
      </Card.Body></Card>)}
    </div> : <Card><Card.Body className="text-muted">No {filter === "all" ? "reviews" : `${filter} reviews`} found.</Card.Body></Card>}
  </Container></Layout>;
}
