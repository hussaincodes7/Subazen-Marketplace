import React from "react";
import { Col, Form, Row } from "react-bootstrap";
import NewModal from "../../../components/UI/Modal";
import { inferCategoryType } from "../../../helpers/categoryType";
import { generatePublicUrl } from "../../../urlConfig";
import IconPicker from "../IconPicker";

const flattenCategories = (categories) => categories.flatMap((category) => [
  category,
  ...flattenCategories(category.children || []),
]);

const EditCategoriesModal = ({
  show,
  handleClose,
  onSubmit,
  loading,
  error,
  rows,
  categories,
  getParentOptions,
  updateRow,
}) => (
  <NewModal
    show={show}
    size="lg"
    handleClose={handleClose}
    modalTitle="Edit categories"
    footerButtonText="Save changes"
    loadingButtonText="Saving changes..."
    onSubmit={onSubmit}
    loading={loading}
    submitDisabled={!rows.length || rows.some((row) => !row.name.trim())}
    dialogClassName="category-modal"
  >
    <p className="text-muted mb-4">Change the name or choose where each category belongs. Leave “No parent” to make it a main category.</p>
    {rows.map((row) => (
      <section className="category-edit-row" key={row._id}>
        <h6 className="category-edit-row-title">{row.name || "Selected category"}</h6>
        <Row className="g-3">
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Category name</Form.Label>
              <Form.Control
                aria-label={`Category name for ${row.name}`}
                value={row.name}
                onChange={(event) => updateRow(row._id, "name", event.target.value)}
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Category type</Form.Label>
              <Form.Select aria-label={`Category type for ${row.name}`} value={row.type || ""} onChange={(event) => updateRow(row._id, "type", event.target.value)}>
                <option value="">Automatic (recommended)</option>
                <option value="page">Page</option>
                <option value="store">Store / collection</option>
                <option value="product">Product category</option>
              </Form.Select>
              <div className="category-image-note mt-2" aria-live="polite">
                {row.type || inferCategoryType(row.name, flattenCategories(categories).find((category) => String(category._id) === String(row.parentId))?.type)}
                {row.type ? " (manually selected)" : row.parentId ? " (inherited from its parent)" : " (inferred from the category name)"}
              </div>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Put inside another category <span className="text-muted">(optional)</span></Form.Label>
              <Form.Select
                aria-label={`Parent category for ${row.name}`}
                value={row.parentId}
                onChange={(event) => updateRow(row._id, "parentId", event.target.value)}
              >
                <option value="">No parent (main category)</option>
                {getParentOptions(categories, row._id).map((option) => (
                  <option key={option.value} value={option.value}>{option.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            {row.parentId ? <Form.Group>
              <Form.Label>Subcategory image <span className="text-muted">(optional)</span></Form.Label>
              {row.categoryImage && <div className="category-image-preview mb-2"><img src={generatePublicUrl(row.categoryImage)} alt={`Current image for ${row.name}`} /><span>Current image</span></div>}
              {row.image && <div className="category-image-preview mb-2"><img src={URL.createObjectURL(row.image)} alt={`New image for ${row.name}`} /><span>New image preview</span></div>}
              <Form.Control key={`${row._id}-${row.parentId}`} type="file" accept="image/webp,image/png,image/jpeg" aria-label={`Replace subcategory image for ${row.name}`} onChange={(event) => { updateRow(row._id, "image", event.target.files?.[0] || null); updateRow(row._id, "removeCategoryImage", false); }} />
              <Form.Text className="text-muted">480 × 360 px WebP, under 150 KB. Use a clean, light background; storefront tiles crop to 4:3.</Form.Text>
              <div className="d-flex flex-wrap gap-2 mt-2">{row.image && <small className="align-self-center">New image: {row.image.name}</small>}{row.categoryImage && <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={() => updateRow(row._id, "removeCategoryImage", true)}>Remove current image</button>}</div>
            </Form.Group> : <Form.Group>
              <Form.Label>Main-category header icon</Form.Label>
              <IconPicker value={row.iconKey || ""} onChange={(value) => updateRow(row._id, "iconKey", value)} />
              <Form.Text className="text-muted">Main categories use an SVG icon in the header. Upload category images only for subcategories.</Form.Text>
              <Form.Check className="mt-2" type="switch" label="Show on homepage" checked={row.showOnHome !== false} onChange={(event) => updateRow(row._id, "showOnHome", event.target.checked)} />
              <Form.Control className="mt-2" aria-label={`Homepage order for ${row.name}`} type="number" min="0" value={row.displayOrder || 0} onChange={(event) => updateRow(row._id, "displayOrder", event.target.value)} />
            </Form.Group>}
          </Col>
          <Col xs={12}>
            <Form.Group><Form.Label>Category page banner <span className="text-muted">(optional)</span></Form.Label>{row.coverImage && <div className="category-cover-preview mb-2"><img src={generatePublicUrl(row.coverImage)} alt={`Current ${row.name} banner`} /></div>}{row.coverFile && <div className="category-cover-preview mb-2"><img src={URL.createObjectURL(row.coverFile)} alt={`New ${row.name} banner`} /></div>}<Form.Control type="file" accept="image/webp,image/png,image/jpeg" onChange={(event) => { updateRow(row._id, "coverFile", event.target.files?.[0] || null); updateRow(row._id, "removeCoverImage", false); }} /><Form.Text className="text-muted">1170 × 360 px WebP, under 500 KB.</Form.Text>{row.coverImage && <button type="button" className="btn btn-link btn-sm d-block text-danger p-0 mt-1" onClick={() => updateRow(row._id, "removeCoverImage", true)}>Remove current banner</button>}</Form.Group>
          </Col>
        </Row>
      </section>
    ))}
    {error && <div className="category-modal-error" role="alert">{error}</div>}
  </NewModal>
);

export default EditCategoriesModal;
