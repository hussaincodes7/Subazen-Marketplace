import React from "react";
import { Button, Form, Modal, Spinner } from "react-bootstrap";

const NewModal = (props) => {
  const handleSubmit = (event) => {
    event.preventDefault();
    props.onSubmit?.(event);
  };

  const modalContent = (
    <>
      <Modal.Header closeButton={!props.loading}>
        <Modal.Title>{props.modalTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{props.children}</Modal.Body>
      <Modal.Footer>
        {props.onSubmit ? (
          <>
            <Button
              type="button"
              variant="outline-secondary"
              disabled={props.loading}
              onClick={props.handleClose}
            >
              {props.cancelButtonText || "Cancel"}
            </Button>
            <Button
              type="submit"
              variant={props.footerButtonVariant || "primary"}
              disabled={props.submitDisabled || props.loading}
            >
              {props.loading && <Spinner size="sm" className="me-2" aria-hidden="true" />}
              {props.loading ? (props.loadingButtonText || "Saving...") : (props.footerButtonText || "Save Changes")}
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" onClick={props.handleClose}>
            {props.footerButtonText || "Close"}
          </Button>
        )}
      </Modal.Footer>
    </>
  );

  return (
    <Modal
      show={props.show}
      onHide={props.loading ? undefined : props.handleClose}
      size={props.size}
      centered
      scrollable
      backdrop={props.loading ? "static" : true}
      keyboard={!props.loading}
      dialogClassName={props.dialogClassName}
    >
      {props.onSubmit ? (
        <Form onSubmit={handleSubmit}>
          {modalContent}
        </Form>
      ) : modalContent}
    </Modal>
  );
};

export default NewModal;
