import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import { Alert, Badge, Button, Container } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { getAllCategory, addCategory, updateCategory, deleteCategories } from "../../actions/category.action";
import { categoryConstants, categoryTypes } from "../../actions/constants";
import CheckboxTree from "react-checkbox-tree";
import { IoIosCheckbox, IoIosCheckboxOutline, IoIosArrowForward, IoIosArrowDown } from "react-icons/io";
import { FaPlus, FaPen, FaSearch, FaTrash, FaTimes } from "react-icons/fa";
import { FaFolder, FaFolderOpen, FaRegFolder } from "react-icons/fa";
import AddCategoryModal from "./modals/AddCategoryModal";
import EditCategoriesModal from "./modals/EditCategoriesModal";
import DeleteCategoriesModal from "./modals/DeleteCategoriesModal";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import "./style.css";

const createCategoryTree = (categories) => categories.map((category) => ({
  value: category._id,
  searchName: category.name,
  label: (
    <span className="category-node-label">
      <span className="category-node-name">{category.name}</span>
      {(category.type || !category.parentId) && <span className="category-node-type">
        {category.type === categoryTypes.PAGE ? "Page" : category.type === categoryTypes.STORE ? "Store" : category.type === categoryTypes.PRODUCT ? "Product" : "Type needed"}
      </span>}
      {category.children?.length > 0 ? (
        <span className="category-node-count">
          {category.children.length} {category.children.length === 1 ? "subcategory" : "subcategories"}
        </span>
      ) : category.parentId ? (
        <span className="category-node-kind">Subcategory</span>
      ) : (
        <span className="category-node-kind">Main category</span>
      )}
    </span>
  ),
  children: createCategoryTree(category.children || []),
}));

const filterCategoryTree = (nodes, query) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return nodes;
  return nodes.reduce((matches, node) => {
    const children = filterCategoryTree(node.children || [], normalizedQuery);
    if (String(node.searchName || "").toLocaleLowerCase().includes(normalizedQuery) || children.length) {
      matches.push({ ...node, children });
    }
    return matches;
  }, []);
};

const collectNodeIds = (nodes) => nodes.flatMap((node) => [node.value, ...collectNodeIds(node.children || [])]);

const createCategoryList = (categories) => categories.flatMap((category) => [
  { value: category._id, name: category.name },
  ...createCategoryList(category.children || []),
]);

const findCategory = (categories, categoryId) => {
  for (const category of categories) {
    if (String(category._id) === String(categoryId)) {
      return category;
    }
    const childCategory = findCategory(category.children || [], categoryId);
    if (childCategory) {
      return childCategory;
    }
  }
  return null;
};

const getCategoryIds = (category) => [
  category._id,
  ...(category.children || []).flatMap(getCategoryIds),
];
const emptyCategories = [];

const getParentOptions = (categories, categoryId) => {
  const currentCategory = findCategory(categories, categoryId);
  const excludedIds = new Set(
    currentCategory ? getCategoryIds(currentCategory).map(String) : [],
  );
  return createCategoryList(categories).filter(
    (option) => !excludedIds.has(String(option.value)),
  );
};

const Category = () => {
  const category = useSelector((state) => state.category);
  const categories = category.categories || emptyCategories;
  const dispatch = useDispatch();

  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [categoryImage, setCategoryImage] = useState(null);
  const [categoryCoverImage, setCategoryCoverImage] = useState(null);
  const [categoryShowOnHome, setCategoryShowOnHome] = useState(true);
  const [categoryDisplayOrder, setCategoryDisplayOrder] = useState(0);
  const [categoryIconKey, setCategoryIconKey] = useState("");
  const [show, setShow] = useState(false);
  const [deleteShow, setDeleteShow] = useState(false);
  const [checked, setChecked] = useState([]);
  const [expanded, setExpanded] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [checkedRows, setCheckedRows] = useState([]);
  const [deleteRows, setDeleteRows] = useState([]);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const treeInitialized = useRef(false);

  const treeNodes = useMemo(() => createCategoryTree(categories), [categories]);
  const visibleTreeNodes = useMemo(() => filterCategoryTree(treeNodes, searchQuery), [treeNodes, searchQuery]);
  const visibleExpanded = searchQuery.trim() ? collectNodeIds(visibleTreeNodes) : expanded;
  const allCategories = useMemo(() => createCategoryList(categories), [categories]);
  const selectedCategories = useMemo(() => checked
    .map((categoryId) => findCategory(categories, categoryId))
    .filter(Boolean), [categories, checked]);
  const remainingChildren = useMemo(() => {
    const selectedIds = new Set(deleteRows.map((row) => String(row._id)));
    const childIds = deleteRows.flatMap((row) => getCategoryIds(row).slice(1));
    const uniqueChildIds = [...new Set(childIds.map(String))];
    return uniqueChildIds
      .filter((id) => !selectedIds.has(id))
      .map((id) => findCategory(categories, id))
      .filter(Boolean);
  }, [categories, deleteRows]);

  useEffect(() => {
    if (!treeInitialized.current && categories.length) {
      setExpanded(categories.map((item) => String(item._id)));
      treeInitialized.current = true;
    }
  }, [categories]);

  const handleShow = () => {
    dispatch({ type: categoryConstants.CLEAR_CATEGORY_ERROR });
    setEditMode(false);
    setCategoryName("");
    setCategoryType("");
    setParentCategoryId("");
    setCategoryImage(null);
    setCategoryCoverImage(null);
    setCategoryShowOnHome(true);
    setCategoryDisplayOrder(0);
    setCategoryIconKey("");
    setShow(true);
  };

  const handleClose = () => {
    if (!category.loading) {
      setShow(false);
    }
  };

  const handleEdit = () => {
    if (!checked.length) {
      return;
    }
    dispatch({ type: categoryConstants.CLEAR_CATEGORY_ERROR });

    const rows = checked
      .map((categoryId) => findCategory(categories, categoryId))
      .filter(Boolean)
      .map((item) => ({
        _id: item._id,
        name: item.name,
        type: item.type || "",
        parentId: item.parentId || "",
        categoryImage: item.categoryImage || "",
        coverImage: item.coverImage || "",
        showOnHome: item.showOnHome !== false,
        displayOrder: item.displayOrder || 0,
        iconKey: item.iconKey || "",
        image: null,
        coverFile: null,
        removeCategoryImage: false,
        removeCoverImage: false,
      }));

    setCheckedRows(rows);
    setEditMode(true);
    setShow(true);
  };

  const handleDeleteShow = () => {
    dispatch({ type: categoryConstants.CLEAR_CATEGORY_ERROR });
    const rows = checked
      .map((categoryId) => findCategory(categories, categoryId))
      .filter(Boolean);
    setDeleteRows(rows);
    setDeleteConfirmed(false);
    setDeleteShow(true);
  };

  const handleDeleteClose = () => {
    if (!category.loading) {
      setDeleteShow(false);
      setDeleteConfirmed(false);
    }
  };

  const handleDeleteCategories = async (event) => {
    event?.preventDefault();
    if (!deleteConfirmed || remainingChildren.length || !deleteRows.length) {
      return;
    }

    const categoryIds = deleteRows.map((row) => row._id);
    const isDeleted = await dispatch(deleteCategories(categoryIds));
    if (!isDeleted) {
      return;
    }

    const deletedIds = new Set(categoryIds.map(String));
    setChecked((items) => items.filter((id) => !deletedIds.has(String(id))));
    setExpanded((items) => items.filter((id) => !deletedIds.has(String(id))));
    setDeleteRows([]);
    setDeleteShow(false);
    setDeleteConfirmed(false);
    await dispatch(getAllCategory());
  };

  const handleCategoryImage = (event) => {
    setCategoryImage(event.target.files?.[0] || null);
  };

  const handleCategoryForm = async (event) => {
    event?.preventDefault();

    if (editMode) {
      for (const row of checkedRows) {
        if (!row.name.trim()) {
          return;
        }

        const form = new FormData();
        form.append("name", row.name.trim());
        if (row.type) form.append("type", row.type);
        form.append("parentId", row.parentId);
        form.append("showOnHome", String(row.showOnHome));
        form.append("displayOrder", String(row.displayOrder || 0));
        form.append("iconKey", row.iconKey || "");
        if (row.parentId && row.image) {
          form.append("categoryImage", row.image);
        }
        if (row.coverFile) form.append("coverImage", row.coverFile);
        if (row.parentId && row.removeCategoryImage) form.append("removeCategoryImage", "true");
        if (row.removeCoverImage) form.append("removeCoverImage", "true");

        const isSaved = await dispatch(updateCategory(row._id, form));
        if (!isSaved) {
          return;
        }
      }

      setCheckedRows([]);
      setChecked([]);
      setEditMode(false);
      setShow(false);
      await dispatch(getAllCategory());
      return;
    }

    if (!categoryName.trim()) {
      return;
    }

    const form = new FormData();
    form.append("name", categoryName.trim());
    if (categoryType) form.append("type", categoryType);
    if (parentCategoryId) {
      form.append("parentId", parentCategoryId);
    }
    if (parentCategoryId && categoryImage) {
      form.append("categoryImage", categoryImage);
    }
    if (categoryCoverImage) form.append("coverImage", categoryCoverImage);
    form.append("showOnHome", String(!parentCategoryId && categoryShowOnHome));
    form.append("displayOrder", String(categoryDisplayOrder || 0));
    form.append("iconKey", categoryIconKey);

    const isSaved = await dispatch(addCategory(form));
    if (!isSaved) {
      return;
    }

    setCategoryName("");
    setCategoryType("");
    setParentCategoryId("");
    setCategoryImage(null);
    setCategoryCoverImage(null);
    setCategoryShowOnHome(true);
    setCategoryDisplayOrder(0);
    setCategoryIconKey("");
    setShow(false);
    await dispatch(getAllCategory());
  };

  const updateEditRow = (categoryId, field, value) => {
    setCheckedRows((rows) => rows.map((row) => {
      if (String(row._id) !== String(categoryId)) return row;
      if (field === "parentId" && !value) return { ...row, parentId: value, image: null, removeCategoryImage: false };
      return { ...row, [field]: value };
    }));
  };

  return (
    <Layout sidebar>
      <Container fluid className="category-page">
        <header className="category-page-header">
          <div>
            <span className="category-page-eyebrow">CATALOG ORGANIZATION</span>
            <h1>Categories</h1>
            <p>Build a clear path from main categories to product types.</p>
          </div>
        </header>

        <div className="category-overview-strip" aria-label="Category overview">
          <div><span className="category-overview-dot primary" /><span><strong>{allCategories.length.toLocaleString("en-PK")}</strong><small>Total categories</small></span></div>
          <div><span className="category-overview-dot soft" /><span><strong>{categories.filter((item) => !item.parentId).length.toLocaleString("en-PK")}</strong><small>Main categories</small></span></div>
          <div><span className="category-overview-dot nested" /><span><strong>{Math.max(0, allCategories.length - categories.length).toLocaleString("en-PK")}</strong><small>Nested categories</small></span></div>
        </div>

        {category.error && !show && !deleteShow && (
          <Alert variant="danger" dismissible onClose={() => dispatch({ type: categoryConstants.CLEAR_CATEGORY_ERROR })}>
            {category.error}
          </Alert>
        )}

        <section className="category-tree-card" aria-label="Category management">
          <div className="category-tree-card-header">
            <div><h2>Category hierarchy</h2><p>Open a category to view its children. Select rows to edit or delete.</p></div>
            <Badge bg="light" text="dark" pill>{visibleTreeNodes.length} main {visibleTreeNodes.length === 1 ? "category" : "categories"}</Badge>
          </div>

          <div className="category-toolbar">
            <div className="category-toolbar-status">
              <Badge bg="light" text="dark" pill>
                {allCategories.length} {allCategories.length === 1 ? "category" : "categories"}
              </Badge>
              <span>{checked.length ? `${checked.length} selected for editing` : "Choose one or more categories to manage"}</span>
            </div>
            <div className="category-toolbar-buttons">
              <Button variant="primary" onClick={handleShow} disabled={category.loading}>
                <FaPlus className="me-2" aria-hidden="true" />Add category
              </Button>
              <Button variant="outline-primary" disabled={!checked.length || category.loading} onClick={handleEdit}>
                <FaPen className="me-2" aria-hidden="true" />Edit
              </Button>
              <Button variant="outline-danger" disabled={!checked.length || category.loading} onClick={handleDeleteShow}>
                <FaTrash className="me-2" aria-hidden="true" />Delete
              </Button>
            </div>
          </div>

          <div className="category-tree-content">
            <div className="category-tree-list">
              <label className="category-search" htmlFor="category-tree-search">
                <FaSearch aria-hidden="true" />
                <input id="category-tree-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search categories" autoComplete="off" />
                {searchQuery && <button type="button" aria-label="Clear category search" onClick={() => setSearchQuery("")}><FaTimes aria-hidden="true" /></button>}
              </label>
              {treeNodes.length ? (visibleTreeNodes.length ? (
                <CheckboxTree
                  nodes={visibleTreeNodes}
                  checked={checked}
                  expanded={visibleExpanded}
                  noCascade
                  onCheck={setChecked}
                  onExpand={setExpanded}
                  icons={{
                    check: <IoIosCheckbox />,
                    uncheck: <IoIosCheckboxOutline />,
                    halfCheck: <IoIosCheckboxOutline />,
                    expandClose: <IoIosArrowForward />,
                    expandOpen: <IoIosArrowDown />,
                    parentClose: <FaFolder />,
                    parentOpen: <FaFolderOpen />,
                    leaf: <FaRegFolder />,
                  }}
                />
              ) : (
                <div className="category-empty-state"><strong>No matching categories</strong><span className="mt-1">Try another name or clear your search.</span></div>
              )) : (
                <div className="category-empty-state">
                  <strong>No categories yet</strong>
                  <span className="mt-1">Add your first category to start organizing products.</span>
                </div>
              )}
            </div>

            <aside className="category-selection-panel">
              <div className="category-selection-heading">
                <h3>Selected categories</h3>
                <Badge bg="primary" pill>{selectedCategories.length}</Badge>
              </div>
              {selectedCategories.length ? (
                <ul>
                  {selectedCategories.map((item) => (
                    <li key={item._id}>
                      <span>{item.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${item.name} from selection`}
                        onClick={() => setChecked((items) => items.filter((id) => String(id) !== String(item._id)))}
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Tick a box in the list to choose categories for editing or deletion.</p>
              )}
            </aside>
          </div>

        </section>
      </Container>

      {!editMode ? (
        <AddCategoryModal
          show={show}
          handleClose={handleClose}
          onSubmit={handleCategoryForm}
          loading={category.loading}
          error={show ? category.error : null}
          categories={categories}
          categoryName={categoryName}
          setCategoryName={setCategoryName}
          categoryType={categoryType}
          setCategoryType={setCategoryType}
          categoryImage={categoryImage}
          categoryCoverImage={categoryCoverImage}
          handleCategoryCoverImage={(event) => setCategoryCoverImage(event.target.files?.[0] || null)}
          showOnHome={categoryShowOnHome}
          setShowOnHome={setCategoryShowOnHome}
          displayOrder={categoryDisplayOrder}
          setDisplayOrder={setCategoryDisplayOrder}
          iconKey={categoryIconKey}
          setIconKey={setCategoryIconKey}
          parentCategoryId={parentCategoryId}
          setParentCategoryId={(value) => {
            setParentCategoryId(value);
            if (!value) setCategoryImage(null);
          }}
          handleCategoryImage={handleCategoryImage}
        />
      ) : (
        <EditCategoriesModal
          show={show}
          handleClose={handleClose}
          onSubmit={handleCategoryForm}
          loading={category.loading}
          error={show ? category.error : null}
          rows={checkedRows}
          categories={categories}
          getParentOptions={getParentOptions}
          updateRow={updateEditRow}
        />
      )}

      <DeleteCategoriesModal
        show={deleteShow}
        handleClose={handleDeleteClose}
        onSubmit={handleDeleteCategories}
        loading={category.loading}
        error={deleteShow ? category.error : null}
        rows={deleteRows}
        remainingChildren={remainingChildren}
        confirmed={deleteConfirmed}
        setConfirmed={setDeleteConfirmed}
      />
    </Layout>
  );
};

export default Category;
