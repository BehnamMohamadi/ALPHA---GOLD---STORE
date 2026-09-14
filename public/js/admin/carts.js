let carts = [];

const renderCarts = () => {
  const query = document
    .getElementById("cartSearch")
    .value.trim()
    .toLowerCase();

  const filtered = carts.filter((cart) => {
    const user = cart.user || {};

    const text = [
      user.firstname,
      user.lastname,
      user.phonenumber,
      user.email,
      ...(cart.items || []).map(
        (item) => item.product?.name,
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return !query || text.includes(query);
  });

  document.getElementById("cartsList").innerHTML =
    filtered.length
      ? filtered
          .map((cart) => {
            const user = cart.user || {};
            const items = cart.items || [];

            return `
              <article class="cart-admin-card">
                <div class="cart-admin-head">
                  <div>
                    <b>
                      ${AdminAPI.escape(
                        `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
                          "کاربر حذف‌شده",
                      )}
                    </b>

                    <small>
                      ${AdminAPI.escape(user.phonenumber || "—")}
                      ${
                        user.email
                          ? ` • ${AdminAPI.escape(user.email)}`
                          : ""
                      }
                    </small>
                  </div>

                  <span class="badge info">
                    ${AdminAPI.number(items.length)} نوع کالا
                  </span>
                </div>

                <div class="cart-items-grid">
                  ${
                    items.length
                      ? items
                          .map(
                            (item) => `
                              <div class="cart-product">
                                <img
                                  src="${AdminAPI.escape(
                                    item.product?.coverImage || "",
                                  )}"
                                  alt=""
                                >

                                <div>
                                  <b>
                                    ${AdminAPI.escape(
                                      item.product?.name || "محصول حذف‌شده",
                                    )}
                                  </b>

                                  <small>
                                    SKU:
                                    ${AdminAPI.escape(
                                      item.product?.sku || "—",
                                    )}
                                  </small>

                                  <small>
                                    تعداد:
                                    ${AdminAPI.number(item.quantity)}
                                  </small>
                                </div>
                              </div>
                            `,
                          )
                          .join("")
                      : '<div class="empty-cart-row">سبد خرید خالی است.</div>'
                  }
                </div>
              </article>
            `;
          })
          .join("")
      : `<div class="note-box small">سبد خریدی پیدا نشد.</div>`;
};

const loadCarts = async () => {
  try {
    const payload =
      await AdminAPI.request("/api/cart/all");

    carts = payload?.data?.carts || [];

    renderCarts();
  } catch (error) {
    adminToast(error.message, "error");
  }
};

document
  .getElementById("cartSearch")
  .addEventListener("input", renderCarts);

loadCarts();
