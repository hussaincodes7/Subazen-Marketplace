import React, { useEffect, useMemo, useState } from "react";
import { Form } from "react-bootstrap";
import Input from "../../../components/UI/Input";
import NewModal from "../../../components/UI/Modal";
import { inferCategoryType } from "../../../helpers/categoryType";
import IconPicker from "../IconPicker";

const createCategoryList = (categories) => categories.flatMap((category) => [
  { value: category._id, name: category.name, type: category.type },
  ...createCategoryList(category.children || []),
]);

const AddCategoryModal = ({
  show,
  handleClose,
  onSubmit,
  loading,
  error,
  categories,
  categoryName,
  setCategoryName,
  categoryType,
  setCategoryType,
  showOnHome,
  setShowOnHome,
  displayOrder,
  setDisplayOrder,
  iconKey,
  setIconKey,
  parentCategoryId,
  setParentCategoryId,
  handleCategoryImage,
  categoryImage,
  categoryCoverImage,
  handleCategoryCoverImage,
}) => {
  const [categorySearch, setCategorySearch] = useState("");
  const filteredCategories = useMemo(() => {
    const search = categorySearch.trim().toLowerCase();
    return createCategoryList(categories).filter((option) => option.name.toLowerCase().includes(search));
  }, [categories, categorySearch]);

  useEffect(() => {
    if (!show) {
      setCategorySearch("");
    }
  }, [show]);

  return (
  <NewModal
    show={show}
    handleClose={handleClose}
    modalTitle="Add category or subcategory"
    footerButtonText="Save category"
    loadingButtonText="Saving category..."
    onSubmit={onSubmit}
    loading={loading}
    submitDisabled={!categoryName.trim()}
    dialogClassName="category-modal"
  >
    <div className="category-image-note mb-3">Create a department and nested product categories here. Manage brands separately from the Brands page; brand names are not category levels.</div>
    <Input
      label="Category name"
      value={categoryName}
      placeholder="For example, Refrigerators"
      onChange={(event) => setCategoryName(event.target.value)}
    />

    <Form.Group className="mb-3">
      <Form.Label htmlFor="category-type">Category type</Form.Label>
      <Form.Select id="category-type" value={categoryType} onChange={(event) => setCategoryType(event.target.value)}>
        <option value="">Automatic (recommended)</option>
        <option value="page">Page</option>
        <option value="store">Store / collection</option>
        <option value="product">Product category</option>
      </Form.Select>
      <div className="category-image-note" aria-live="polite">
        {categoryType || inferCategoryType(categoryName, createCategoryList(categories).find((item) => String(item.value) === String(parentCategoryId))?.type)}
        {categoryType ? " (manually selected)" : parentCategoryId ? " (inherited from its parent)" : " (inferred from the category name)"}
      </div>
      <Form.Text className="text-muted">Choose a type yourself, or leave Automatic to infer it from the name and parent category.</Form.Text>
    </Form.Group>

    <Form.Group className="mb-3">
      <Form.Label>Put inside another category <span className="text-muted">(optional)</span></Form.Label>
      <Form.Control
        className="mb-2"
        type="search"
        placeholder="Search categories"
        aria-label="Search parent categories"
        value={categorySearch}
        onChange={(event) => setCategorySearch(event.target.value)}
      />
      <Form.Select
        value={parentCategoryId}
        onChange={(event) => setParentCategoryId(event.target.value)}
      >
        <option value="">No parent (main category)</option>
        {filteredCategories.map((option) => (
          <option key={option.value} value={option.value}>{option.name}</option>
        ))}
      </Form.Select>
      <Form.Text className="text-muted">
        Leave this empty for a main category. Choose one to make a subcategory.
      </Form.Text>
    </Form.Group>

    {!parentCategoryId && <>
      <Form.Group className="mb-3"><Form.Label>Main-category header icon <span className="text-muted">(optional, searchable SVG icon)</span></Form.Label><IconPicker value={iconKey || ""} onChange={setIconKey} /><Form.Text className="text-muted">Choose an SVG icon for this main category. The header uses icons; upload images for subcategory tiles.</Form.Text></Form.Group>
      <Form.Check className="mb-3" type="switch" label="Show on storefront homepage" checked={showOnHome} onChange={(event) => setShowOnHome(event.target.checked)} />
      <Form.Group className="mb-3"><Form.Label>Homepage order</Form.Label><Form.Control type="number" min="0" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} /></Form.Group>
    </>}
    {parentCategoryId ? <Form.Group className="mb-3">
      <Form.Label>Subcategory image <span className="text-muted">(optional)</span></Form.Label>
      {categoryImage && <div className="category-image-preview mb-2"><img src={URL.createObjectURL(categoryImage)} alt="New subcategory image preview" /></div>}
      <Form.Control type="file" accept="image/webp,image/png,image/jpeg" onChange={handleCategoryImage} />
      <Form.Text className="text-muted">480 × 360 px WebP, under 150 KB. Use a clean, light background; storefront tiles crop to 4:3.</Form.Text>
    </Form.Group> : <div className="category-image-note mb-3">Main categories use the selected SVG icon in the header. Upload a category image only for a subcategory.</div>}
    <Form.Group className="mb-3"><Form.Label>Category page banner <span className="text-muted">(optional)</span></Form.Label>{categoryCoverImage && <div className="category-cover-preview mb-2"><img src={URL.createObjectURL(categoryCoverImage)} alt="New category banner preview" /></div>}<Form.Control type="file" accept="image/webp,image/png,image/jpeg" onChange={handleCategoryCoverImage} /><Form.Text className="text-muted">1170 × 360 px WebP, under 500 KB.</Form.Text></Form.Group>

    {error && <div className="category-modal-error" role="alert">{error}</div>}
  </NewModal>
  );
};

export default AddCategoryModal;
