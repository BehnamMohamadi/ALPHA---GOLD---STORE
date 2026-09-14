let productPage = 1;
let productTotalPages = 1;

const renderProductPagination = () => {
  const host = document.getElementById("productsPagination");

  host.innerHTML = `
    <span>
      صفحه ${AdminAPI.number(productPage)}
      از ${AdminAPI.number(productTotalPages)}
    </span>

    <div class="page-buttons">
      <button
        ${productPage <= 1 ? "disabled" : ""}
        data-page="${productPage - 1}"
      >‹</button>

      <button class="active">
        ${AdminAPI.number(productPage)}
      </button>

      <button
        ${productPage >= productTotalPages ? "disabled" : ""}
        data-page="${productPage + 1}"
      >›</button>
    </div>
  `;

  host.querySelectorAll("[data-page]").forEach((button) => {
    button.onclick = () => {
      productPage = Number(button.dataset.page);
      loadProducts();
    };
  });
};

const loadCategories = async () => {
  const payload = await AdminAPI.request(
    `/api/categories/all${AdminAPI.qs({
      limit: 100,
      sort: "sortOrder",
    })}`,
  );

  const categories = payload?.data?.categories || [];

  document.getElementById("productCategoryFilter").innerHTML =
    `<option value="">همه دسته‌بندی‌ها</option>` +
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

const loadProducts = async () => {
  const params = {
    page: productPage,
    limit: 15,
    sort: document.getElementById("productSort").value,
    category: document.getElementById("productCategoryFilter").value,
    isActive: document.getElementById("productStatusFilter").value,
  };

  try {
    const payload = await AdminAPI.request(
      `/api/products/all${AdminAPI.qs(params)}`,
    );

    let products = payload?.data?.products || [];

    const query = document
      .getElementById("productSearch")
      .value.trim()
      .toLowerCase();

    if (query) {
      products = products.filter((product) =>
        `${product.name} ${product.sku}`
          .toLowerCase()
          .includes(query),
      );
    }

    document.getElementById("productsBody").innerHTML = products.length
      ? products
          .map(
            (product) => `
              <tr>
                <td>
                  <div class="product-cell">
                    <img
                      class="product-thumb"
                      src="${AdminAPI.escape(product.coverImage || "")}"
                      alt=""
                    >

                    <b>${AdminAPI.escape(product.name)}</b>
                  </div>
                </td>

                <td>${AdminAPI.escape(product.sku)}</td>

                <td>
                  ${AdminAPI.escape(product.category?.name || "—")}
                </td>

                <td>
                  ${AdminAPI.number(product.goldWeight)} گرم
                </td>

                <td>
                  ${AdminAPI.number(product.karat)}
                </td>

                <td>
                  ${AdminAPI.number(product.stock)}
                </td>

                <td>
                  ${
                    product.isActive
                      ? '<span class="badge success">فعال</span>'
                      : '<span class="badge danger">غیرفعال</span>'
                  }
                </td>

                <td>
                  <div class="row-actions">
                    <a
                      class="table-btn"
                      href="/admin/products/${product._id}/edit"
                    >
                      ویرایش
                    </a>

                    <button
                      class="table-btn"
                      data-delete-product="${product._id}"
                      data-name="${AdminAPI.escape(product.name)}"
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="8">محصولی پیدا نشد.</td></tr>`;

    productTotalPages = payload?.pagination?.pages || 1;

    renderProductPagination();

    document
      .querySelectorAll("[data-delete-product]")
      .forEach((button) => {
        button.onclick = async () => {
          const accepted = await adminConfirm(
            `محصول «${button.dataset.name}» حذف شود؟`,
          );

          if (!accepted) return;

          try {
            await AdminAPI.request(
              `/api/products/${button.dataset.deleteProduct}`,
              { method: "DELETE" },
            );

            adminToast("محصول حذف شد.");
            loadProducts();
          } catch (error) {
            adminToast(error.message, "error");
          }
        };
      });
  } catch (error) {
    adminToast(error.message, "error");
  }
};

document
  .getElementById("productSort")
  .addEventListener("change", () => {
    productPage = 1;
    loadProducts();
  });

document
  .getElementById("productCategoryFilter")
  .addEventListener("change", () => {
    productPage = 1;
    loadProducts();
  });

document
  .getElementById("productStatusFilter")
  .addEventListener("change", () => {
    productPage = 1;
    loadProducts();
  });

document
  .getElementById("productSearch")
  .addEventListener("input", loadProducts);

(async () => {
  try {
    await loadCategories();
    await loadProducts();
  } catch (error) {
    adminToast(error.message, "error");
  }
})();
