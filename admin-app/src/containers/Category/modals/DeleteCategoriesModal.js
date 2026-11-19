import React from "react";
import { Alert, Form } from "react-bootstrap";
import NewModal from "../../../components/UI/Modal";

const DeleteCategoriesModal = ({
  show,
  handleClose,
  onSubmit,
  loading,
  error,
  rows,
  remainingChildren,
  confirmed,
  setConfirmed,
}) => (
  <NewModal
    show={show}
    handleClose={handleClose}
    modalTitle="Delete categories"
    footerButtonText="Delete selected"
    loadingButtonText="Deleting..."
    footerButtonVariant="danger"
    onSubmit={onSubmit}
    loading={loading}
    submitDisabled={!rows.length || !confirmed || remainingChildren.length > 0}
    dialogClassName="category-modal"
  >
    <p className="mb-3">You are about to permanently delete these categories:</p>
    <ul className="category-delete-list">
      {rows.map((row) => <li key={row._id}>{row.name}</li>)}
    </ul>

    {remainingChildren.length > 0 && (
      <Alert variant="warning" className="mb-3">
        Select these subcategories too before deleting their parent:
        <ul className="mb-0 mt-2">
          {remainingChildren.map((child) => <li key={child._id}>{child.name}</li>)}
        </ul>
      </Alert>
    )}

    <Alert variant="light" className="mb-3">
      Categories used by products cannot be deleted. Move or remove those products first.
    </Alert>

    {error && <Alert variant="danger" role="alert">{error}</Alert>}

    <Form.Check
      type="checkbox"
      id="confirm-category-delete"
      label="I understand this deletion cannot be undone."
      checked={confirmed}
      onChange={(event) => setConfirmed(event.target.checked)}
    />
  </NewModal>
);

export default DeleteCategoriesModal;
