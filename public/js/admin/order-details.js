const orderId = document.getElementById("orderDetailsPage").dataset.orderId;

let currentOrder = null;
let currentPayments = [];

const meta = (items) =>
  items
    .map(
      ([key, value]) => `
          <div>
            <dt>${key}</dt>
            <dd>${value}</dd>
          </div>
        `,
    )
    .join("");

const getAdminName = (user) => {
  if (!user) {
    return "سیستم";
  }

  const fullName = `${user.firstname || ""} ${user.lastname || ""}`.trim();

  return fullName || user.email || "ادمین";
};

const resolutionLabel = (resolution) => {
  const labels = {
    stock_supplied: "موجودی تأمین شد",

    refunded: "وجه برگشت داده شد",
  };

  return labels[resolution] || "—";
};

const historyActionLabel = (action) => {
  const labels = {
    opened: "نیاز به بررسی ایجاد شد",

    resolved: "بررسی تعیین تکلیف شد",

    resolution_changed: "نتیجه بررسی ویرایش شد",
  };

  return labels[action] || action || "—";
};

const getReviewReason = (reason) => {
  const value = String(reason || "");

  const lower = value.toLowerCase();

  if (lower.includes("requested quantity for") && lower.includes("is not available")) {
    return "پرداخت با موفقیت انجام شده، اما موجودی یکی از کالاهای سفارش کافی نبوده است.";
  }

  if (lower.includes("one or more order products no longer exist")) {
    return "پرداخت انجام شده، اما یکی از محصولات سفارش دیگر در سیستم وجود ندارد.";
  }

  if (lower.includes("after the 10-minute payment window")) {
    return "پرداخت بعد از پایان مهلت ۱۰ دقیقه‌ای تأیید شده است.";
  }

  if (lower.includes("order finalization")) {
    return "پرداخت موفق بوده اما تکمیل خودکار سفارش با مشکل مواجه شده است.";
  }

  return value || "این پرداخت نیازمند بررسی دستی است.";
};

const hasActiveReview = () =>
  currentPayments.some(
    (payment) =>
      payment.requiresReview === true &&
      ["pending", "resolving"].includes(payment.reviewStatus),
  );

const syncOrderStatusForm = () => {
  if (!currentOrder) {
    return;
  }

  const form = document.getElementById("orderStatusForm");

  const select = form.elements.status;

  const button = document.getElementById("saveOrderStatus");

  const message = document.getElementById("orderStatusLockMessage");

  form.elements.carrier.value = currentOrder.carrier || "";
  form.elements.trackingCode.value = currentOrder.trackingCode || "";
  const allowed = { pending: ["cancelled"], confirmed: ["shipped"], shipped: ["delivered"] };
  [...select.options].forEach(o => o.disabled = !allowed[currentOrder.status]?.includes(o.value));
  select.value = allowed[currentOrder.status]?.[0] || currentOrder.status;

  if (hasActiveReview()) {
    select.disabled = true;
    button.disabled = true;

    message.className = "note-box small";

    message.textContent =
      "این سفارش یک پرداخت موفقِ نیازمند بررسی دارد. ابتدا Review پرداخت را تعیین تکلیف کنید.";

    return;
  }

  if (["payment_pending", "review"].includes(currentOrder.status)) {
    select.disabled = true;
    button.disabled = true;

    message.className = "note-box small";

    message.textContent = "این وضعیت توسط Payment Service مدیریت می‌شود.";

    return;
  }

  select.disabled = !allowed[currentOrder.status]?.length;
  button.disabled = !allowed[currentOrder.status]?.length;

  message.className = "note-box small hidden";

  message.textContent = "";
};

const renderOrder = (order) => {
  currentOrder = order;

  document.getElementById("orderMeta").innerHTML = meta([
    ["شماره سفارش", AdminAPI.escape(order.orderNumber)],

    ["مبلغ کل", AdminAPI.money(order.totalAmount)],

    ["تعداد اقلام", AdminAPI.number(order.totalItems)],

    ["وضعیت سفارش", AdminAPI.badge(order.status, "order")],

    ["وضعیت پرداخت", AdminAPI.badge(order.paymentStatus, "payment")],

    ["اعتبار قیمت تا", AdminAPI.date(order.priceExpiresAt)],

    ["تاریخ ثبت", AdminAPI.date(order.createdAt)],
  ]);

  const user = order.user || {};

  document.getElementById("customerMeta").innerHTML = meta([
    [
      "نام",

      AdminAPI.escape(`${user.firstname || ""} ${user.lastname || ""}`.trim() || "—"),
    ],

    ["موبایل", AdminAPI.escape(user.phonenumber || "—")],

    ["ایمیل", AdminAPI.escape(user.email || "—")],

    ["نقش", user.role === "admin" ? "ادمین" : "کاربر"],
  ]);

  const address = order.shippingAddressSnapshot;

  const addressPanel = document.getElementById("shippingAddressPanel");

  if (address && address.addressLine) {
    addressPanel.classList.remove("hidden");

    document.getElementById("shippingAddress").innerHTML = `
        <div class="address-card-head">
          <b>
            ${AdminAPI.escape(address.title || "آدرس ارسال")}
          </b>

          <span>
            ${AdminAPI.escape(address.recipientName || "")}
          </span>
        </div>

        <p>
          ${AdminAPI.escape(
            `${address.province || ""}، ${address.city || ""}، ${
              address.addressLine || ""
            }`,
          )}
        </p>

        <div class="address-meta-row">
          <span>
            موبایل:
            ${AdminAPI.escape(address.recipientPhone || "—")}
          </span>

          <span>
            کد پستی:
            ${AdminAPI.escape(address.postalCode || "—")}
          </span>

          ${
            address.buildingNumber
              ? `
                <span>
                  پلاک:
                  ${AdminAPI.escape(address.buildingNumber)}
                </span>
              `
              : ""
          }

          ${
            address.unit
              ? `
                <span>
                  واحد:
                  ${AdminAPI.escape(address.unit)}
                </span>
              `
              : ""
          }
        </div>
      `;
  } else {
    addressPanel.classList.add("hidden");
  }

  document.getElementById("orderItems").innerHTML =
    (order.items || [])
      .map((item) => {
        const pricing = item.pricingSnapshot || {};

        return `
              <article class="order-item">
                <img
                  src="${AdminAPI.escape(item.productSnapshot?.coverImage || "")}"
                  alt=""
                >

                <div class="order-product">
                  <b>
                    ${AdminAPI.escape(item.productSnapshot?.name || "—")}
                  </b>

                  <small>
                    ${AdminAPI.escape(item.productSnapshot?.sku || "")}
                    • تعداد
                    ${AdminAPI.number(item.quantity)}
                  </small>

                  <small>
                    ${AdminAPI.money(item.totalPrice)}
                  </small>
                </div>

                <div class="snapshot-grid">
                  <div>
                    <span>وزن</span>

                    <b>
                      ${AdminAPI.number(pricing.goldWeight)}
                      g
                    </b>
                  </div>

                  <div>
                    <span>عیار</span>

                    <b>
                      ${AdminAPI.number(pricing.karat)}
                    </b>
                  </div>

                  <div>
                    <span>
                      قیمت گرم
                    </span>

                    <b>
                      ${AdminAPI.number(pricing.goldPricePerGram)}
                    </b>
                  </div>

                  <div>
                    <span>
                      ارزش طلا
                    </span>

                    <b>
                      ${AdminAPI.number(pricing.goldValue)}
                    </b>
                  </div>

                  <div>
                    <span>اجرت</span>

                    <b>
                      ${AdminAPI.number(pricing.wage?.amount)}
                    </b>
                  </div>

                  <div>
                    <span>سود</span>

                    <b>
                      ${AdminAPI.number(pricing.profit?.amount)}
                    </b>
                  </div>

                  <div>
                    <span>
                      مالیات
                    </span>

                    <b>
                      ${AdminAPI.number(pricing.tax?.amount)}
                    </b>
                  </div>

                  <div>
                    <span>
                      متعلقات
                    </span>

                    <b>
                      ${AdminAPI.number(pricing.accessoriesPrice)}
                    </b>
                  </div>
                </div>
              </article>
            `;
      })
      .join("") ||
    `
        <div class="note-box small">
          آیتمی وجود ندارد.
        </div>
      `;

  syncOrderStatusForm();
};

const renderHistory = (payment) => {
  const history = payment.reviewHistory || [];

  if (!history.length) {
    return "";
  }

  return `
      <div
        style="
          margin-top:16px;
          padding-top:14px;
          border-top:1px solid rgba(255,255,255,.08);
        "
      >
        <strong>
          تاریخچه بررسی
        </strong>

        <div
          style="
            display:grid;
            gap:8px;
            margin-top:10px;
          "
        >
          ${history
            .slice()
            .reverse()
            .map(
              (entry) => `
                <div class="note-box small">
                  <div>
                    <b>
                      ${AdminAPI.escape(historyActionLabel(entry.action))}
                    </b>
                  </div>

                  ${
                    entry.fromResolution || entry.toResolution
                      ? `
                        <div style="margin-top:5px;">
                          ${
                            entry.fromResolution
                              ? `
                                از:
                                <b>
                                  ${AdminAPI.escape(
                                    resolutionLabel(entry.fromResolution),
                                  )}
                                </b>
                              `
                              : ""
                          }

                          ${
                            entry.toResolution
                              ? `
                                ${entry.fromResolution ? " ← " : ""}

                                به:
                                <b>
                                  ${AdminAPI.escape(resolutionLabel(entry.toResolution))}
                                </b>
                              `
                              : ""
                          }
                        </div>
                      `
                      : ""
                  }

                  <div style="margin-top:5px;">
                    توسط:
                    <b>
                      ${AdminAPI.escape(getAdminName(entry.actor))}
                    </b>
                  </div>

                  <div style="margin-top:5px;">
                    ${AdminAPI.date(entry.createdAt)}
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
};

const renderReviewHistory = (payments) => {
  const container = document.getElementById("paymentReviewMessage");

  const reviews = payments.filter(
    (payment) =>
      payment.reviewReason ||
      payment.requiresReview ||
      payment.reviewStatus === "resolved" ||
      (payment.reviewHistory || []).length,
  );

  if (!reviews.length) {
    container.className = "hidden";

    container.innerHTML = "";

    return;
  }

  container.className = "";

  container.innerHTML = reviews
    .map((payment) => {
      const active =
        payment.requiresReview === true &&
        ["pending", "resolving"].includes(payment.reviewStatus);

      if (active) {
        return `
                <div
                  class="note-box"
                  data-review-box="${payment._id}"
                >
                  <div
                    style="
                      display:flex;
                      justify-content:space-between;
                      gap:12px;
                      align-items:center;
                      flex-wrap:wrap;
                    "
                  >
                    <strong>
                      ⚠ نیازمند بررسی ادمین
                    </strong>

                    ${AdminAPI.badge("review", "order")}
                  </div>

                  <p style="margin-top:10px;">
                    ${AdminAPI.escape(getReviewReason(payment.reviewReason))}
                  </p>

                  <div
                    class="hidden"
                    data-review-error="${payment._id}"
                    style="
                      margin-top:12px;
                      padding:10px 12px;
                      border:1px solid rgba(220,75,75,.45);
                      border-radius:8px;
                      background:rgba(220,75,75,.08);
                    "
                  ></div>

                  <div
                    style="
                      display:flex;
                      gap:10px;
                      flex-wrap:wrap;
                      margin-top:14px;
                    "
                  >
                    <button
                      type="button"
                      class="btn btn-gold"
                      data-review-payment="${payment._id}"
                      data-resolution="stock_supplied"
                    >
                      موجودی تأمین شد
                    </button>

                    <button
                      type="button"
                      class="btn btn-ghost"
                      data-review-payment="${payment._id}"
                      data-resolution="refunded"
                    >
                      برگشت وجه انجام شد
                    </button>
                  </div>

                  ${renderHistory(payment)}
                </div>
              `;
      }

      if (payment.reviewStatus === "resolved") {
        return `
                <div
                  class="note-box"
                  data-review-box="${payment._id}"
                >
                  <div
                    style="
                      display:flex;
                      justify-content:space-between;
                      gap:12px;
                      align-items:center;
                      flex-wrap:wrap;
                    "
                  >
                    <strong>
                      ✓ بررسی پرداخت رفع شده
                    </strong>

                    <span class="badge success">
                      رفع‌شده
                    </span>
                  </div>

                  <p style="margin-top:10px;">
                    <strong>
                      دلیل اولیه:
                    </strong>

                    ${AdminAPI.escape(getReviewReason(payment.reviewReason))}
                  </p>

                  <p>
                    <strong>
                      نتیجه فعلی:
                    </strong>

                    ${AdminAPI.escape(resolutionLabel(payment.resolution))}
                  </p>

                  <p>
                    <strong>
                      آخرین تغییر توسط:
                    </strong>

                    ${AdminAPI.escape(getAdminName(payment.resolvedBy))}
                  </p>

                  <p>
                    <strong>
                      زمان آخرین تغییر:
                    </strong>

                    ${AdminAPI.date(payment.resolvedAt)}
                  </p>

                  <div
                    class="hidden"
                    data-review-error="${payment._id}"
                    style="
                      margin-top:12px;
                      padding:10px 12px;
                      border:1px solid rgba(220,75,75,.45);
                      border-radius:8px;
                      background:rgba(220,75,75,.08);
                    "
                  ></div>

                  <div style="margin-top:14px;">
                    <strong>
                      ویرایش نتیجه بررسی
                    </strong>

                    <div
                      style="
                        display:flex;
                        gap:10px;
                        flex-wrap:wrap;
                        margin-top:8px;
                      "
                    >
                      ${
                        payment.resolution !== "stock_supplied"
                          ? `
                            <button
                              type="button"
                              class="btn btn-gold"
                              data-review-payment="${payment._id}"
                              data-resolution="stock_supplied"
                            >
                              تغییر به «موجودی تأمین شد»
                            </button>
                          `
                          : ""
                      }

                      ${
                        payment.resolution !== "refunded"
                          ? `
                            <button
                              type="button"
                              class="btn btn-ghost"
                              data-review-payment="${payment._id}"
                              data-resolution="refunded"
                            >
                              تغییر به «برگشت وجه»
                            </button>
                          `
                          : ""
                      }
                    </div>
                  </div>

                  ${renderHistory(payment)}
                </div>
              `;
      }

      return `
              <div class="note-box small">
                <strong>
                  سابقه بررسی
                </strong>

                <p>
                  ${AdminAPI.escape(getReviewReason(payment.reviewReason))}
                </p>

                ${renderHistory(payment)}
              </div>
            `;
    })
    .join("");
};

const renderPayments = (payments) => {
  currentPayments = payments || [];

  const body = document.getElementById("paymentsBody");

  if (!currentPayments.length) {
    body.innerHTML = `
        <tr>
          <td colspan="7">
            برای این سفارش تراکنش پرداختی وجود ندارد.
          </td>
        </tr>
      `;

    renderReviewHistory([]);

    syncOrderStatusForm();

    return;
  }

  body.innerHTML = currentPayments
    .map((payment) => {
      let reviewBadge = `
              <span class="badge info">
                ندارد
              </span>
            `;

      if (payment.requiresReview && payment.reviewStatus !== "resolved") {
        reviewBadge = `
                <span class="badge danger">
                  نیاز به بررسی
                </span>
              `;
      } else if (payment.reviewStatus === "resolved") {
        reviewBadge = `
                <span class="badge success">
                  رفع‌شده
                </span>
              `;
      }

      return `
              <tr>
                <td>
                  ${AdminAPI.escape(payment.gateway || "—")}
                </td>

                <td>
                  ${AdminAPI.money(payment.amount)}
                </td>

                <td>
                  ${AdminAPI.badge(payment.status, "paymentAttempt")}
                </td>

                <td>
                  ${AdminAPI.escape(payment.authority || "—")}
                </td>

                <td>
                  ${AdminAPI.escape(payment.referenceId || "—")}
                </td>

                <td>
                  ${reviewBadge}
                </td>

                <td>
                  ${AdminAPI.date(payment.createdAt)}
                </td>
              </tr>
            `;
    })
    .join("");

  renderReviewHistory(currentPayments);

  syncOrderStatusForm();
};

const loadOrder = async () => {
  try {
    const payload = await AdminAPI.request(`/api/orders/admin/${orderId}`);

    renderOrder(payload?.data?.order);
  } catch (error) {
    adminToast(AdminAPI.errorMessage(error), "error");
  }
};

const loadPayments = async () => {
  try {
    const payload = await AdminAPI.request(`/api/payments/admin/order/${orderId}`);

    renderPayments(payload?.data?.payments || []);
  } catch (error) {
    currentPayments = [];

    document.getElementById("paymentsBody").innerHTML = `
        <tr>
          <td colspan="7">
            خطا در دریافت اطلاعات پرداخت‌ها
          </td>
        </tr>
      `;

    adminToast(AdminAPI.errorMessage(error), "error");

    syncOrderStatusForm();
  }
};

const refreshPageData = async () => {
  await Promise.all([loadOrder(), loadPayments()]);
};

document.getElementById("orderStatusForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;

  const button = document.getElementById("saveOrderStatus");

  if (hasActiveReview()) {
    adminToast("ابتدا بررسی پرداخت این سفارش را تعیین تکلیف کنید.", "error");

    return;
  }

  button.disabled = true;

  try {
    await AdminAPI.request(`/api/orders/admin/${orderId}`, {
      method: "PATCH",

      body: {
        status: form.elements.status.value,
        carrier: form.elements.carrier.value,
        trackingCode: form.elements.trackingCode.value,
      },
    });

    adminToast("وضعیت سفارش بروزرسانی شد.");

    await refreshPageData();
  } catch (error) {
    adminToast(AdminAPI.errorMessage(error), "error");
  } finally {
    button.disabled = false;

    syncOrderStatusForm();
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-review-payment]");

  if (!button) {
    return;
  }

  const paymentId = button.dataset.reviewPayment;

  const resolution = button.dataset.resolution;

  const reviewError = document.querySelector(`[data-review-error="${paymentId}"]`);

  if (reviewError) {
    reviewError.classList.add("hidden");

    reviewError.textContent = "";
  }

  const payment = currentPayments.find((item) => String(item._id) === String(paymentId));

  const previousResolution = payment?.resolution || null;

  let confirmation;

  if (resolution === "stock_supplied") {
    confirmation =
      previousResolution === "refunded"
        ? "نتیجه فعلی «برگشت وجه» است. با این تغییر موجودی کالا بررسی و از Stock کم می‌شود و سفارش دوباره تأیید خواهد شد. ادامه می‌دهید؟"
        : "آیا موجودی کالا واقعاً تأمین شده است؟ سیستم موجودی را دوباره بررسی می‌کند.";
  } else {
    confirmation =
      previousResolution === "stock_supplied"
        ? "با این تغییر سفارش لغو می‌شود و موجودی کم‌شده این سفارش به Stock برمی‌گردد. آیا وجه واقعاً به مشتری برگشت داده شده است؟"
        : "آیا وجه واقعاً به مشتری برگشت داده شده است؟";
  }

  if (!await adminConfirm(confirmation)) {
    return;
  }

  button.disabled = true;

  try {
    await AdminAPI.request(`/api/payments/admin/${paymentId}/review`, {
      method: "PATCH",

      body: {
        resolution,
      },
    });

    adminToast(
      previousResolution
        ? "نتیجه بررسی با موفقیت ویرایش شد."
        : "بررسی با موفقیت تعیین تکلیف شد.",
    );

    await refreshPageData();
  } catch (error) {
    const message = AdminAPI.errorMessage(error);

    if (reviewError) {
      reviewError.textContent = message;

      reviewError.classList.remove("hidden");
    }

    adminToast(message, "error");
  } finally {
    button.disabled = false;
  }
});

refreshPageData();
