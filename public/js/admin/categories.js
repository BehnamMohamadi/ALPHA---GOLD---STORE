let categoryList = [];

const form = document.getElementById("categoryForm");
const title = document.getElementById("categoryFormTitle");
const submitButton = document.getElementById("categorySubmitButton");
const cancelButton = document.getElementById("categoryCancelEdit");

const resetCategoryForm = () => {
  form.reset();
  form.elements.categoryId.value = "";
  form.elements.sortOrder.value = 0;
  form.elements.isActive.checked = true;
  document.getElementById("categoryIconFile").value = "";

  title.textContent = "افزودن دسته";
  submitButton.textContent = "ثبت دسته";
  cancelButton.classList.add("hidden");
};

const startCategoryEdit = (categoryId) => {
  const category = categoryList.find((item) => item._id === categoryId);

  if (!category) return;

  form.elements.categoryId.value = category._id;
  form.elements.name.value = category.name || "";
  form.elements.slug.value = category.slug || "";
  form.elements.sortOrder.value = category.sortOrder ?? 0;
  form.elements.isActive.checked = Boolean(category.isActive);

  title.textContent = "ویرایش دسته";
  submitButton.textContent = "ذخیره تغییرات";
  cancelButton.classList.remove("hidden");

  form.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
};

const uploadCategoryIcon = async (categoryId) => {
  const file = document.getElementById("categoryIconFile").files[0];

  if (!file) return;

  const formData = new FormData();
  formData.append("icon", file);

  await AdminAPI.request(
    `/api/categories/edit-icon/${categoryId}`,
    {
      method: "PATCH",
      body: formData,
    },
  );
};

const loadCategories = async () => {
  try {
    const payload = await AdminAPI.request(
      `/api/categories/all${AdminAPI.qs({
        limit: 100,
        sort: "sortOrder",
      })}`,
    );

    categoryList = payload?.data?.categories || [];

    document.getElementById("categoriesBody").innerHTML =
      categoryList.length
        ? categoryList
            .map(
              (category) => `
                <tr>
                  <td>
                    <img
                      class="category-icon"
                      src="${AdminAPI.escape(category.icon || "")}"
                      alt=""
                    >
                  </td>

                  <td><b>${AdminAPI.escape(category.name)}</b></td>
                  <td>${AdminAPI.escape(category.slug)}</td>
                  <td>${AdminAPI.number(category.sortOrder)}</td>

                  <td>
                    ${
                      category.isActive
                        ? '<span class="badge success">فعال</span>'
                        : '<span class="badge danger">غیرفعال</span>'
                    }
                  </td>

                  <td>
                    <div class="row-actions">
                      <button
                        class="table-btn"
                        data-edit-category="${category._id}"
                      >
                        ویرایش
                      </button>

                      <button
                        class="table-btn"
                        data-delete-category="${category._id}"
                        data-name="${AdminAPI.escape(category.name)}"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              `,
            )
            .join("")
        : `<tr><td colspan="6">دسته‌ای وجود ندارد.</td></tr>`;

    document
      .querySelectorAll("[data-edit-category]")
      .forEach((button) => {
        button.onclick = () =>
          startCategoryEdit(button.dataset.editCategory);
      });

    document
      .querySelectorAll("[data-delete-category]")
      .forEach((button) => {
        button.onclick = async () => {
          if (
            !await adminConfirm(
              `دسته «${button.dataset.name}» حذف شود؟`,
            )
          ) {
            return;
          }

          try {
            await AdminAPI.request(
              `/api/categories/${button.dataset.deleteCategory}`,
              { method: "DELETE" },
            );

            adminToast("دسته حذف شد.");

            if (
              form.elements.categoryId.value ===
              button.dataset.deleteCategory
            ) {
              resetCategoryForm();
            }

            loadCategories();
          } catch (error) {
            adminToast(error.message, "error");
          }
        };
      });
  } catch (error) {
    adminToast(error.message, "error");
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const categoryId = data.get("categoryId");
  const name = String(data.get("name") || "").trim();

  if (!name) {
    return adminToast("نام دسته را وارد کنید.", "error");
  }

  const body = {
    name,
    sortOrder: Number(data.get("sortOrder") || 0),
    isActive: form.elements.isActive.checked,
  };

  if (data.get("slug")) {
    body.slug = String(data.get("slug")).trim();
  }

  submitButton.disabled = true;

  try {
    const payload = await AdminAPI.request(
      categoryId
        ? `/api/categories/${categoryId}`
        : "/api/categories",
      {
        method: categoryId ? "PATCH" : "POST",
        body,
      },
    );

    const savedId =
      categoryId ||
      payload?.data?.category?._id;

    if (savedId) {
      await uploadCategoryIcon(savedId);
    }

    adminToast(
      categoryId
        ? "دسته بروزرسانی شد."
        : "دسته ساخته شد.",
    );

    resetCategoryForm();
    loadCategories();
  } catch (error) {
    adminToast(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

cancelButton.addEventListener("click", resetCategoryForm);

loadCategories();
