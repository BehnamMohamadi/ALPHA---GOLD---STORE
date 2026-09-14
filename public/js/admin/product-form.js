const initialProductId =
  document.getElementById("productFormPage").dataset.productId;

let activeProductId = initialProductId || "";

const form = document.getElementById("productForm");
const formErrors = document.getElementById("productFormErrors");

let categories = [];
let subCategories = [];
let currentProduct = null;

const DEFAULT_COVER =
  "/images/models-images/product-images/products/product-cover-image-default.webp";

const setValue = (name, value) => {
  const element = form.elements[name];

  if (!element) return;

  if (element.type === "checkbox") {
    element.checked = Boolean(value);
  } else {
    element.value = value ?? "";
  }
};

const clearValidationErrors = () => {
  formErrors.classList.add("hidden");
  formErrors.innerHTML = "";

  form
    .querySelectorAll(".field-error")
    .forEach((element) => {
      element.classList.remove("field-error");
      element.removeAttribute("aria-invalid");
    });
};

const showValidationErrors = (
  errors,
  title = "لطفاً اطلاعات محصول را بررسی کنید",
) => {
  clearValidationErrors();

  if (!errors.length) return;

  formErrors.innerHTML = `
    <strong class="form-errors-title">
      ${AdminAPI.escape(title)}
    </strong>

    <ul>
      ${errors
        .map(
          (error) => `
            <li>${AdminAPI.escape(error.message)}</li>
          `,
        )
        .join("")}
    </ul>
  `;

  formErrors.classList.remove("hidden");

  errors.forEach((error) => {
    if (!error.field) return;

    const field = form.elements[error.field];

    if (!field) return;

    field.classList.add("field-error");
    field.setAttribute("aria-invalid", "true");
  });

  const first = errors.find(
    (error) => error.field && form.elements[error.field],
  );

  if (first) {
    const field = form.elements[first.field];

    field.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    setTimeout(() => field.focus(), 200);
  } else {
    formErrors.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
};

const validateProductForm = () => {
  const errors = [];

  const name = form.elements.name.value.trim();
  const sku = form.elements.sku.value.trim();
  const category = form.elements.category.value;
  const subCategory = form.elements.subCategory.value;
  const gender = form.elements.gender.value;
  const goldWeight = Number(form.elements.goldWeight.value);

  if (!name) {
    errors.push({
      field: "name",
      message: "نام محصول را وارد کنید.",
    });
  } else if (name.length < 2) {
    errors.push({
      field: "name",
      message: "نام محصول باید حداقل ۲ کاراکتر باشد.",
    });
  }

  if (!sku) {
    errors.push({
      field: "sku",
      message: "کد SKU محصول را وارد کنید.",
    });
  }

  if (!gender) {
    errors.push({
      field: "gender",
      message: "جنسیت محصول را انتخاب کنید.",
    });
  }

  if (!category) {
    errors.push({
      field: "category",
      message: "دسته‌بندی محصول را انتخاب کنید.",
    });
  }

  if (!subCategory) {
    errors.push({
      field: "subCategory",
      message: "زیردسته محصول را انتخاب کنید.",
    });
  }

  if (
    !form.elements.goldWeight.value ||
    !Number.isFinite(goldWeight) ||
    goldWeight <= 0
  ) {
    errors.push({
      field: "goldWeight",
      message: "وزن طلا باید عددی بزرگ‌تر از صفر باشد.",
    });
  }

  return errors;
};

const backendErrorMessage = (error) =>
  error?.payload?.message ||
  error?.payload?.error?.message ||
  error?.message ||
  "عملیات انجام نشد.";

const renderSubCategories = (
  categoryId,
  selectedId = "",
) => {
  const options = subCategories.filter(
    (subCategory) =>
      (
        subCategory.category?._id ||
        subCategory.category
      ) === categoryId,
  );

  const select = document.getElementById("subCategorySelect");

  select.innerHTML =
    `<option value="">انتخاب کنید</option>` +
    options
      .map(
        (subCategory) => `
          <option
            value="${subCategory._id}"
            ${
              subCategory._id === selectedId
                ? "selected"
                : ""
            }
          >
            ${AdminAPI.escape(subCategory.name)}
          </option>
        `,
      )
      .join("");
};

const addDetailRow = (title = "", value = "") => {
  const row = document.createElement("div");

  row.className = "detail-row";

  row.innerHTML = `
    <input
      class="detail-title"
      placeholder="عنوان"
      value="${AdminAPI.escape(title)}"
    >

    <input
      class="detail-value"
      placeholder="مقدار"
      value="${AdminAPI.escape(value)}"
    >

    <button
      type="button"
      class="remove-detail"
    >
      ×
    </button>
  `;

  row.querySelector(".remove-detail").onclick = () => row.remove();

  document.getElementById("detailsContainer").appendChild(row);
};

const renderStoredImages = (product) => {
  document.getElementById("coverPreview").src =
    product?.coverImage || DEFAULT_COVER;

  document.getElementById("galleryPreview").innerHTML =
    (product?.images || [])
      .filter(Boolean)
      .map(
        (src) => `
          <img src="${AdminAPI.escape(src)}" alt="">
        `,
      )
      .join("");
};

const previewCoverFile = () => {
  const file = document.getElementById("coverFile").files[0];

  if (!file) {
    document.getElementById("coverPreview").src =
      currentProduct?.coverImage || DEFAULT_COVER;
    return;
  }

  document.getElementById("coverPreview").src =
    URL.createObjectURL(file);
};

const previewGalleryFiles = () => {
  const files = [
    ...document.getElementById("galleryFiles").files,
  ];

  if (!files.length) {
    renderStoredImages(currentProduct);
    return;
  }

  document.getElementById("galleryPreview").innerHTML =
    files
      .slice(0, 10)
      .map(
        (file) => `
          <img src="${URL.createObjectURL(file)}" alt="">
        `,
      )
      .join("");
};

const loadLookups = async () => {
  const [categoryPayload, subCategoryPayload] =
    await Promise.all([
      AdminAPI.request(
        `/api/categories${AdminAPI.qs({
          limit: 100,
          sort: "sortOrder",
        })}`,
      ),

      AdminAPI.request(
        `/api/subCategories${AdminAPI.qs({
          limit: 100,
          sort: "sortOrder",
        })}`,
      ),
    ]);

  categories = categoryPayload?.data?.categories || [];
  subCategories =
    subCategoryPayload?.data?.subCategories || [];

  document.getElementById("categorySelect").innerHTML =
    `<option value="">انتخاب کنید</option>` +
    categories
      .map(
        (category) => `
          <option value="${category._id}">
            ${AdminAPI.escape(category.name)}
          </option>
        `,
      )
      .join("");
};

const fillProduct = (product) => {
  currentProduct = product;

  setValue("name", product.name);
  setValue("sku", product.sku);
  setValue("slug", product.slug);
  setValue("gender", product.gender);

  const categoryId =
    product.category?._id ||
    product.category;

  const subCategoryId =
    product.subCategory?._id ||
    product.subCategory;

  setValue("category", categoryId);
  renderSubCategories(categoryId, subCategoryId);
  setValue("subCategory", subCategoryId);

  setValue("goldWeight", product.goldWeight);
  setValue("karat", product.karat);
  setValue("stock", product.stock);
  setValue("accessoriesPrice", product.accessoriesPrice);
  setValue("wageType", product.wage?.type);
  setValue("wageValue", product.wage?.value);
  setValue("pricingMode", product.pricing?.mode);
  setValue("profitPercent", product.pricing?.profitPercent);
  setValue("taxPercent", product.pricing?.taxPercent);
  setValue("wageEnabled", product.pricing?.wageEnabled);
  setValue("isActive", product.isActive);
  setValue("isFeatured", product.isFeatured);
  setValue("description", product.description);

  document.getElementById("detailsContainer").innerHTML = "";

  (product.details || []).forEach((detail) => {
    addDetailRow(detail.title, detail.value);
  });

  if (!(product.details || []).length) {
    addDetailRow();
  }

  renderStoredImages(product);
};

const buildProductBody = () => {
  const data = new FormData(form);

  const nullableNumber = (key) =>
    data.get(key) === ""
      ? null
      : Number(data.get(key));

  const details = [
    ...document.querySelectorAll(".detail-row"),
  ]
    .map((row) => ({
      title: row
        .querySelector(".detail-title")
        .value.trim(),

      value: row
        .querySelector(".detail-value")
        .value.trim(),
    }))
    .filter((detail) => detail.title && detail.value);

  const body = {
    name: data.get("name").trim(),
    sku: data.get("sku").trim(),
    category: data.get("category"),
    subCategory: data.get("subCategory"),
    gender: data.get("gender"),
    goldWeight: Number(data.get("goldWeight")),
    karat: Number(data.get("karat")),

    wage: {
      type: data.get("wageType"),
      value: Number(data.get("wageValue") || 0),
    },

    accessoriesPrice:
      Number(data.get("accessoriesPrice") || 0),

    pricing: {
      mode: data.get("pricingMode"),
      profitPercent: nullableNumber("profitPercent"),
      taxPercent: nullableNumber("taxPercent"),
      wageEnabled: form.elements.wageEnabled.checked,
    },

    details,
    stock: Number(data.get("stock") || 0),
    description: data.get("description") || "",
    isActive: form.elements.isActive.checked,
    isFeatured: form.elements.isFeatured.checked,
  };

  if (data.get("slug")) {
    body.slug = data.get("slug").trim();
  }

  return body;
};

const uploadSelectedImages = async (productId) => {
  const coverFile =
    document.getElementById("coverFile").files[0];

  const galleryFiles = [
    ...document.getElementById("galleryFiles").files,
  ];

  if (galleryFiles.length > 10) {
    throw new Error(
      "حداکثر ۱۰ تصویر برای گالری انتخاب کنید.",
    );
  }

  if (coverFile) {
    const coverData = new FormData();
    coverData.append("coverImage", coverFile);

    await AdminAPI.request(
      `/api/products/edit-cover/${productId}`,
      {
        method: "PATCH",
        body: coverData,
      },
    );
  }

  if (galleryFiles.length) {
    const galleryData = new FormData();

    galleryFiles.forEach((file) => {
      galleryData.append("images", file);
    });

    await AdminAPI.request(
      `/api/products/images/${productId}`,
      {
        method: "PUT",
        body: galleryData,
      },
    );
  }
};

document
  .getElementById("categorySelect")
  .addEventListener("change", (event) => {
    renderSubCategories(event.target.value);
  });

document
  .getElementById("addDetailButton")
  .addEventListener("click", () => addDetailRow());

document
  .getElementById("coverFile")
  .addEventListener("change", previewCoverFile);

document
  .getElementById("galleryFiles")
  .addEventListener("change", previewGalleryFiles);

form.addEventListener("input", (event) => {
  if (event.target.classList.contains("field-error")) {
    event.target.classList.remove("field-error");
    event.target.removeAttribute("aria-invalid");
  }
});

form.addEventListener("change", (event) => {
  if (event.target.classList.contains("field-error")) {
    event.target.classList.remove("field-error");
    event.target.removeAttribute("aria-invalid");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearValidationErrors();

  const errors = validateProductForm();

  if (errors.length) {
    showValidationErrors(errors);
    return;
  }

  const saveButton =
    document.getElementById("saveProductButton");

  const defaultText = saveButton.textContent;

  saveButton.disabled = true;
  saveButton.textContent = "در حال ذخیره...";

  try {
    const body = buildProductBody();

    let payload;

    if (activeProductId) {
      payload = await AdminAPI.request(
        `/api/products/${activeProductId}`,
        {
          method: "PATCH",
          body,
        },
      );
    } else {
      payload = await AdminAPI.request(
        "/api/products",
        {
          method: "POST",
          body,
        },
      );

      activeProductId =
        payload?.data?.product?._id || "";

      currentProduct =
        payload?.data?.product || null;
    }

    if (!activeProductId) {
      throw new Error("شناسه محصول دریافت نشد.");
    }

    await uploadSelectedImages(activeProductId);

    adminToast(
      initialProductId
        ? "محصول بروزرسانی شد."
        : "محصول با موفقیت ساخته شد.",
    );

    location.href = "/admin/products";
  } catch (error) {
    showValidationErrors(
      [
        {
          field: null,
          message: backendErrorMessage(error),
        },
      ],
      "ذخیره محصول انجام نشد",
    );

    adminToast(
      "اطلاعات محصول را بررسی کنید.",
      "error",
    );
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = defaultText;
  }
});

(async () => {
  try {
    await loadLookups();

    if (activeProductId) {
      const payload = await AdminAPI.request(
        `/api/products/admin/${activeProductId}`,
      );

      fillProduct(payload?.data?.product);
    } else {
      renderSubCategories("");
      addDetailRow();
      renderStoredImages(null);
    }
  } catch (error) {
    adminToast(
      backendErrorMessage(error),
      "error",
    );
  }
})();
