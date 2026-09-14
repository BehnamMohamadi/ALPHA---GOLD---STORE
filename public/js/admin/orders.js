let orderPage = 1;
let orderPages = 1;

const getReviewMessage = (order) => {
  const review = order.paymentReview;

  if (!review?.active) {
    return "";
  }

  const rawReason = String(review.reason || "").toLowerCase();

  if (
    rawReason.includes("requested quantity for") &&
    rawReason.includes("is not available")
  ) {
    return "پرداخت انجام شده اما موجودی یکی از کالاهای سفارش کافی نیست.";
  }

  if (rawReason.includes("no longer exist")) {
    return "پرداخت انجام شده اما یکی از محصولات سفارش دیگر در سیستم وجود ندارد.";
  }

  if (rawReason.includes("after the 10-minute payment window")) {
    return "پرداخت بعد از پایان مهلت ۱۰ دقیقه‌ای تأیید شده و نیازمند بررسی است.";
  }

  return "پرداخت موفق بوده اما تکمیل سفارش نیازمند بررسی ادمین است.";
};

const renderPagination = () => {
  const container = document.getElementById("ordersPagination");

  container.innerHTML = `
      <span>
        صفحه
        ${AdminAPI.number(orderPage)}
        از
        ${AdminAPI.number(orderPages)}
      </span>

      <div class="page-buttons">
        <button
          data-p="${orderPage - 1}"
          ${orderPage <= 1 ? "disabled" : ""}
        >
          ‹
        </button>

        <button class="active">
          ${AdminAPI.number(orderPage)}
        </button>

        <button
          data-p="${orderPage + 1}"
          ${orderPage >= orderPages ? "disabled" : ""}
        >
          ›
        </button>
      </div>
    `;

  container.querySelectorAll("[data-p]").forEach((button) => {
    button.onclick = () => {
      orderPage = Number(button.dataset.p);

      loadOrders();
    };
  });
};

const renderOrderRows = (orders) => {
  if (!orders.length) {
    return `
        <tr>
          <td colspan="8">
            سفارشی پیدا نشد.
          </td>
        </tr>
      `;
  }

  return orders
    .map((order) => {
      const hasReview = order.paymentReview?.active === true;

      const reviewMessage = getReviewMessage(order);

      const mainRow = `
            <tr>
              <td>
                <b>
                  ${AdminAPI.escape(order.orderNumber)}
                </b>
              </td>

              <td>
                ${AdminAPI.escape(
                  `${order.user?.firstname || ""} ${order.user?.lastname || ""}`.trim() ||
                    "—",
                )}
              </td>

              <td>
                ${AdminAPI.number(order.totalItems)}
              </td>

              <td>
                ${AdminAPI.money(order.totalAmount)}
              </td>

              <td>
                ${AdminAPI.badge(order.status, "order")}

                ${
                  hasReview
                    ? `
                      <div style="margin-top:6px;">
                        <span class="badge danger">
                          ⚠ نیاز به بررسی
                        </span>
                      </div>
                    `
                    : ""
                }
              </td>

              <td>
                ${AdminAPI.badge(order.paymentStatus, "payment")}
              </td>

              <td>
                ${AdminAPI.date(order.createdAt)}
              </td>

              <td>
                <a
                  class="table-btn"
                  href="/admin/orders/${order._id}"
                >
                  جزئیات
                </a>
              </td>
            </tr>
          `;

      if (!hasReview) {
        return mainRow;
      }

      return `
            ${mainRow}

            <tr>
              <td colspan="8">
                <div
                  class="note-box small"
                  style="
                    border-color:rgba(220,75,75,.45);
                    background:rgba(220,75,75,.06);
                  "
                >
                  <strong>
                    ⚠ این سفارش نیازمند تصمیم ادمین است
                  </strong>

                  <div style="margin-top:6px;">
                    ${AdminAPI.escape(reviewMessage)}
                  </div>

                  <div style="margin-top:9px;">
                    <a
                      class="table-btn"
                      href="/admin/orders/${order._id}"
                    >
                      بررسی و تعیین تکلیف
                    </a>
                  </div>
                </div>
              </td>
            </tr>
          `;
    })
    .join("");
};

const loadOrders = async () => {
  try {
    const params = {
      page: orderPage,

      limit: 15,

      sort: "-createdAt",

      status: document.getElementById("orderStatusFilter").value,

      paymentStatus: document.getElementById("paymentStatusFilter").value,
    };

    const payload = await AdminAPI.request(`/api/orders/all${AdminAPI.qs(params)}`);

    let orders = payload?.data?.orders || [];

    const search = document.getElementById("ordersSearch").value.trim().toLowerCase();

    if (search) {
      orders = orders.filter((order) =>
        `
                ${order.orderNumber}
                ${order.user?.firstname || ""}
                ${order.user?.lastname || ""}
              `
          .toLowerCase()
          .includes(search),
      );
    }

    document.getElementById("ordersBody").innerHTML = renderOrderRows(orders);

    orderPages = payload?.totalPages || 1;

    renderPagination();
  } catch (error) {
    document.getElementById("ordersBody").innerHTML = `
          <tr>
            <td colspan="8">
              خطا در دریافت سفارش‌ها
            </td>
          </tr>
        `;

    adminToast(AdminAPI.errorMessage(error), "error");
  }
};

["orderStatusFilter", "paymentStatusFilter"].forEach((id) => {
  document.getElementById(id).addEventListener("change", () => {
    orderPage = 1;

    loadOrders();
  });
});

document.getElementById("ordersSearch").addEventListener("input", loadOrders);

loadOrders();
