let paymentPage = 1;
let paymentPages = 1;

const getOrderInfo = (payment) => {
  if (payment.order && typeof payment.order === "object") {
    return payment.order;
  }

  return null;
};

const getUserInfo = (payment) => {
  if (payment.user && typeof payment.user === "object") {
    return payment.user;
  }

  return null;
};

const renderPaymentPagination = () => {
  const container = document.getElementById("paymentsPagination");

  container.innerHTML = `
      <span>
        صفحه
        ${AdminAPI.number(paymentPage)}
        از
        ${AdminAPI.number(paymentPages)}
      </span>

      <div class="page-buttons">
        <button
          data-page="${paymentPage - 1}"
          ${paymentPage <= 1 ? "disabled" : ""}
        >
          ‹
        </button>

        <button class="active">
          ${AdminAPI.number(paymentPage)}
        </button>

        <button
          data-page="${paymentPage + 1}"
          ${paymentPage >= paymentPages ? "disabled" : ""}
        >
          ›
        </button>
      </div>
    `;

  container.querySelectorAll("[data-page]").forEach((button) => {
    button.onclick = () => {
      paymentPage = Number(button.dataset.page);

      loadPayments();
    };
  });
};

const renderPayments = (payments) => {
  const body = document.getElementById("paymentsBody");

  if (!payments.length) {
    body.innerHTML = `
      <tr>
        <td colspan="10">
          پرداختی پیدا نشد.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = payments
    .map((payment) => {
      const order = getOrderInfo(payment);

      const user = getUserInfo(payment);

      const orderId = order?._id || payment.order || "";

      const orderNumber = order?.orderNumber || "—";

      const customerName = user
        ? `${user.firstname || ""} ${user.lastname || ""}`.trim() || "—"
        : "—";

      const reviewBadge = payment.requiresReview
        ? `
            <span
              class="badge danger"
              title="${AdminAPI.escape(payment.reviewReason || "نیاز به بررسی دستی")}"
            >
              نیاز به بررسی
            </span>
          `
        : `
            <span
              class="badge success"
            >
              عادی
            </span>
          `;

      return `
        <tr>
          <td>
            <b>
              ${AdminAPI.escape(orderNumber)}
            </b>
          </td>

          <td>
            ${AdminAPI.escape(customerName)}
          </td>

          <td>
            ${AdminAPI.escape(payment.gateway || "—")}
          </td>

          <td>
            ${AdminAPI.money(payment.amount)}
          </td>

          <td>
            ${AdminAPI.badge(payment.status, "paymentAttempt")}
          </td>

          <td dir="ltr">
            ${AdminAPI.escape(payment.authority || "—")}
          </td>

          <td dir="ltr">
            ${AdminAPI.escape(payment.referenceId || "—")}
          </td>

          <td>
            ${reviewBadge}
          </td>

          <td>
            ${AdminAPI.date(payment.createdAt)}
          </td>

          <td>
            ${
              orderId
                ? `
                  <a
                    class="table-btn"
                    href="/admin/orders/${AdminAPI.escape(orderId)}"
                  >
                    سفارش
                  </a>
                `
                : "—"
            }
          </td>
        </tr>

        ${
          payment.requiresReview && payment.reviewReason
            ? `
              <tr>
                <td
                  colspan="10"
                  style="white-space:normal"
                >
                  <div
                    class="note-box small"
                  >
                    <b>
                      علت نیاز به بررسی:
                    </b>

                    ${AdminAPI.escape(payment.reviewReason)}
                  </div>
                </td>
              </tr>
            `
            : ""
        }
      `;
    })
    .join("");
};

const loadPayments = async () => {
  const body = document.getElementById("paymentsBody");

  try {
    body.innerHTML = `
        <tr>
          <td colspan="10">
            در حال دریافت اطلاعات...
          </td>
        </tr>
      `;

    const params = {
      page: paymentPage,
      limit: 15,
      sort: "-createdAt",

      status: document.getElementById("paymentAttemptStatusFilter").value,

      gateway: document.getElementById("paymentGatewayFilter").value,

      requiresReview: document.getElementById("paymentReviewFilter").value,
    };

    const payload = await AdminAPI.request(`/api/payments/all${AdminAPI.qs(params)}`);

    let payments = payload?.data?.payments || [];

    const search = document.getElementById("paymentsSearch").value.trim().toLowerCase();

    if (search) {
      payments = payments.filter((payment) => {
        const order = getOrderInfo(payment);

        const haystack = [
          order?.orderNumber,
          payment.authority,
          payment.referenceId,
          payment.gateway,
          payment.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });
    }

    renderPayments(payments);

    paymentPages = payload?.totalPages || 1;

    renderPaymentPagination();
  } catch (error) {
    body.innerHTML = `
        <tr>
          <td colspan="10">
            خطا در دریافت پرداخت‌ها
          </td>
        </tr>
      `;

    adminToast(error.message, "error");
  }
};

["paymentAttemptStatusFilter", "paymentGatewayFilter", "paymentReviewFilter"].forEach(
  (id) => {
    document.getElementById(id).addEventListener("change", () => {
      paymentPage = 1;
      loadPayments();
    });
  },
);

document.getElementById("paymentsSearch").addEventListener("input", loadPayments);

loadPayments();
