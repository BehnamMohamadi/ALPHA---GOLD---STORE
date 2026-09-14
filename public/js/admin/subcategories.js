let subCategoryList = [];
let parentCategories = [];

const form = document.getElementById("subCategoryForm");
const title = document.getElementById("subCategoryFormTitle");
const submitButton = document.getElementById("subCategorySubmitButton");
const cancelButton = document.getElementById("subCategoryCancelEdit");

const loadParentCategories = async () => {
  const payload = await AdminAPI.request(
    `/api/categories/all${AdminAPI.qs({
      limit: 100,
      sort: "sortOrder",
    })}`,
  );

  parentCategories = payload?.data?.categories || [];

  document.getElementById("parentCategorySelect").innerHTML =
    `<option value="">انتخاب کنید</option>` +
    parentCategories
      .map(
        (category) => `
          <option value="${category._id}">
            ${AdminAPI.escape(category.name)}
          </option>
        `,
      )
      .join("");
};

const resetSubCategoryForm = () => {
  form.reset();
  form.elements.subCategoryId.value = "";
  form.elements.sortOrder.value = 0;
  form.elements.isActive.checked = true;
  document.getElementById("subCategoryIconFile").value = "";

  title.textContent = "افزودن زیردسته";
  submitButton.textContent = "ثبت زیردسته";
  cancelButton.classList.add("hidden");
};

const startSubCategoryEdit = (subCategoryId) => {
  const subCategory = subCategoryList.find(
    (item) => item._id === subCategoryId,
  );

  if (!subCategory) return;

  form.elements.subCategoryId.value = subCategory._id;
  form.elements.name.value = subCategory.name || "";
  form.elements.category.value =
    subCategory.category?._id ||
    subCategory.category ||
    "";
  form.elements.slug.value = subCategory.slug || "";
  form.elements.sortOrder.value = subCategory.sortOrder ?? 0;
  form.elements.isActive.checked = Boolean(subCategory.isActive);

  title.textContent = "ویرایش زیردسته";
  submitButton.textContent = "ذخیره تغییرات";
  cancelButton.classList.remove("hidden");

  form.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
};

const uploadSubCategoryIcon = async (subCategoryId) => {
  const file = document.getElementById("subCategoryIconFile").files[0];

  if (!file) return;

  const formData = new FormData();
  formData.append("icon", file);

  await AdminAPI.request(
    `/api/subCategories/edit-icon/${subCategoryId}`,
    {
      method: "PATCH",
      body: formData,
    },
  );
};

const loadSubCategories = async () => {
  try {
    const payload = await AdminAPI.request(
      `/api/subCategories/all${AdminAPI.qs({
        limit: 100,
        sort: "sortOrder",
      })}`,
    );

    subCategoryList = payload?.data?.subCategories || [];

    document.getElementById("subCategoriesBody").innerHTML =
      subCategoryList.length
        ? subCategoryList
            .map(
              (subCategory) => `
                <tr>
                  <td>
                    <img
                      class="category-icon"
                      src="${AdminAPI.escape(subCategory.icon || "")}"
                      alt=""
                    >
                  </td>

                  <td>
                    <b>${AdminAPI.escape(subCategory.name)}</b>
                  </td>

                  <td>
                    ${AdminAPI.escape(subCategory.category?.name || "—")}
                  </td>

                  <td>
                    ${AdminAPI.escape(subCategory.slug)}
                  </td>

                  <td>
                    ${AdminAPI.number(subCategory.sortOrder)}
                  </td>

                  <td>
                    ${
                      subCategory.isActive
                        ? '<span class="badge success">فعال</span>'
                        : '<span class="badge danger">غیرفعال</span>'
                    }
                  </td>

                  <td>
                    <div class="row-actions">
                      <button
                        class="table-btn"
                        data-edit-sub="${subCategory._id}"
                      >
                        ویرایش
                      </button>

                      <button
                        class="table-btn"
                        data-delete-sub="${subCategory._id}"
                        data-name="${AdminAPI.escape(subCategory.name)}"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              `,
            )
            .join("")
        : `<tr><td colspan="7">زیردسته‌ای وجود ندارد.</td></tr>`;

    document
      .querySelectorAll("[data-edit-sub]")
      .forEach((button) => {
        button.onclick = () =>
          startSubCategoryEdit(button.dataset.editSub);
      });

    document
      .querySelectorAll("[data-delete-sub]")
      .forEach((button) => {
        button.onclick = async () => {
          if (
            !await adminConfirm(
              `زیردسته «${button.dataset.name}» حذف شود؟`,
            )
          ) {
            return;
          }

          try {
            await AdminAPI.request(
              `/api/subCategories/${button.dataset.deleteSub}`,
              { method: "DELETE" },
            );

            adminToast("زیردسته حذف شد.");

            if (
              form.elements.subCategoryId.value ===
              button.dataset.deleteSub
            ) {
              resetSubCategoryForm();
            }

            loadSubCategories();
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
  const subCategoryId = data.get("subCategoryId");
  const name = String(data.get("name") || "").trim();
  const category = String(data.get("category") || "");

  if (!name) {
    return adminToast("نام زیردسته را وارد کنید.", "error");
  }

  if (!category) {
    return adminToast("دسته والد را انتخاب کنید.", "error");
  }

  const body = {
    name,
    category,
    sortOrder: Number(data.get("sortOrder") || 0),
    isActive: form.elements.isActive.checked,
  };

  if (data.get("slug")) {
    body.slug = String(data.get("slug")).trim();
  }

  submitButton.disabled = true;

  try {
    const payload = await AdminAPI.request(
      subCategoryId
        ? `/api/subCategories/${subCategoryId}`
        : "/api/subCategories",
      {
        method: subCategoryId ? "PATCH" : "POST",
        body,
      },
    );

    const savedId =
      subCategoryId ||
      payload?.data?.subCategory?._id;

    if (savedId) {
      await uploadSubCategoryIcon(savedId);
    }

    adminToast(
      subCategoryId
        ? "زیردسته بروزرسانی شد."
        : "زیردسته ساخته شد.",
    );

    resetSubCategoryForm();
    loadSubCategories();
  } catch (error) {
    adminToast(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

cancelButton.addEventListener("click", resetSubCategoryForm);

(async () => {
  try {
    await loadParentCategories();
    await loadSubCategories();
  } catch (error) {
    adminToast(error.message, "error");
  }
})();
