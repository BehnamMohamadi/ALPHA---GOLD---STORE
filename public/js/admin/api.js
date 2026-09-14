window.AdminAPI = (() => {
  const request = async (url, options = {}) => {
    const config = {
      credentials: "same-origin",

      ...options,

      headers: {
        "X-Requested-With": "Alpha",
        ...(options.headers || {}),
      },
    };

    if (
      config.body &&
      !(config.body instanceof FormData) &&
      typeof config.body !== "string"
    ) {
      config.headers["Content-Type"] = "application/json";

      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);

    let payload = null;

    if (response.status !== 204) {
      const text = await response.text();

      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = {
            message: text,
          };
        }
      }
    }

    if (!response.ok) {
      const error = new Error(
        payload?.message || payload?.error?.message || `HTTP ${response.status}`,
      );

      error.status = response.status;

      error.payload = payload;

      error.code = payload?.code || null;

      error.details = payload?.details || null;

      if (
        response.status === 401 &&
        location.pathname.startsWith("/admin") &&
        location.pathname !== "/login"
      ) {
        location.href = "/login";
      }

      throw error;
    }

    return payload;
  };

  const qs = (params = {}) => {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, value);
      }
    });

    const value = search.toString();

    return value ? `?${value}` : "";
  };

  const money = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "—";
    }

    return `${new Intl.NumberFormat("fa-IR").format(Number(value))} تومان`;
  };

  const number = (value) =>
    value === null || value === undefined
      ? "—"
      : new Intl.NumberFormat("fa-IR").format(Number(value));

  const date = (value) => {
    if (!value) {
      return "—";
    }

    try {
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",

        month: "2-digit",

        day: "2-digit",

        hour: "2-digit",

        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const escape = (value = "") =>
    String(value).replace(
      /[&<>"']/g,

      (ch) =>
        ({
          "&": "&amp;",

          "<": "&lt;",

          ">": "&gt;",

          '"': "&quot;",

          "'": "&#039;",
        })[ch],
    );

  const errorMessage = (error) => {
    const code = error?.code || error?.payload?.code || null;

    const details = error?.details || error?.payload?.details || null;

    const productName = details?.productName ? ` «${details.productName}»` : "";

    const messages = {
      INSUFFICIENT_STOCK: `موجودی کالا${productName} هنوز برای این سفارش کافی نیست. ابتدا موجودی محصول را افزایش دهید و سپس دوباره «موجودی تأمین شد» را بزنید.`,

      PRODUCT_NOT_FOUND:
        "یکی از محصولات این سفارش دیگر در سیستم وجود ندارد. محصول را بررسی کنید و سپس سفارش را تعیین تکلیف کنید.",

      PRODUCT_INACTIVE: `محصول${productName} در حال حاضر غیرفعال است و امکان تأیید سفارش وجود ندارد.`,

      STOCK_CHANGED:
        "موجودی محصول هم‌زمان تغییر کرده است. موجودی فعلی را بررسی کنید و دوباره تلاش کنید.",

      PAYMENT_REVIEW_BUSY:
        "بررسی این پرداخت در حال انجام است. چند لحظه بعد دوباره تلاش کنید.",

      PAYMENT_REVIEW_NOT_FOUND: "این پرداخت سابقه بررسی ندارد.",

      PAYMENT_REVIEW_NOT_EDITABLE:
        "نتیجه بررسی این پرداخت در وضعیت فعلی قابل ویرایش نیست.",

      ORDER_NOT_FOUND: "سفارش موردنظر پیدا نشد.",

      PAYMENT_NOT_FOUND: "پرداخت موردنظر پیدا نشد.",

      SHIPPING_ADDRESS_REQUIRED: "برای ادامه پرداخت باید آدرس ارسال مشخص شده باشد.",

      ORDER_PRICE_EXPIRED:
        "اعتبار قیمت این سفارش تمام شده است. سفارش را با قیمت جدید دوباره آماده کنید.",

      PAYMENT_ALREADY_IN_PROGRESS: "پرداخت این سفارش در حال انجام است.",

      ORDER_ALREADY_PAID: "این سفارش قبلاً پرداخت شده است.",

      ORDER_NOT_PAYABLE: "این سفارش در وضعیت فعلی قابل پرداخت نیست.",

      PAYMENT_FINALIZING: "پرداخت در حال نهایی‌شدن است. چند لحظه بعد دوباره بررسی کنید.",

      INVALID_REVIEW_RESOLUTION: "نتیجه انتخاب‌شده برای بررسی پرداخت معتبر نیست.",

      VALIDATION_ERROR: "اطلاعات ارسال‌شده معتبر نیست.",
    };

    if (code && messages[code]) {
      return messages[code];
    }

    /*
     * Fallback برای داده‌ها و Errorهای
     * قدیمی که هنوز code ندارند.
     */
    const message = String(error?.message || error || "").trim();

    const lower = message.toLowerCase();

    if (
      lower.includes("requested quantity for") ||
      lower.includes("stock is still insufficient")
    ) {
      return (
        "موجودی کالا هنوز برای این سفارش کافی نیست. " +
        "ابتدا موجودی محصول را افزایش دهید و سپس دوباره تلاش کنید."
      );
    }

    if (lower.includes("payment review must be resolved")) {
      return "ابتدا بررسی پرداخت این سفارش را تعیین تکلیف کنید.";
    }

    if (lower.includes("order not found")) {
      return "سفارش موردنظر پیدا نشد.";
    }

    if (lower.includes("payment not found")) {
      return "پرداخت موردنظر پیدا نشد.";
    }

    return message || "خطایی رخ داده است. دوباره تلاش کنید.";
  };

  const badge = (value, type = "order") => {
    const maps = {
      order: {
        pending: ["در انتظار", "warning"],

        payment_pending: ["در حال پرداخت", "warning"],

        review: ["نیازمند بررسی", "danger"],

        confirmed: ["تأییدشده", "success"],
        shipped: ["ارسال‌شده", "info"],
        delivered: ["تحویل‌شده", "success"],

        cancelled: ["لغوشده", "danger"],

        expired: ["منقضی‌شده", "danger"],
      },

      payment: {
        unpaid: ["پرداخت‌نشده", "danger"],

        pending: ["در انتظار پرداخت", "warning"],

        paid: ["پرداخت‌شده", "success"],

        failed: ["ناموفق", "danger"],

        refunded: ["برگشت‌خورده", "info"],
      },

      paymentAttempt: {
        created: ["ایجادشده", "info"],

        pending: ["در انتظار", "warning"],

        processing: ["در حال پردازش", "warning"],

        paid: ["موفق", "success"],

        failed: ["ناموفق", "danger"],

        cancelled: ["لغوشده", "danger"],

        expired: ["منقضی‌شده", "danger"],

        refunded: ["برگشت وجه", "info"],
      },

      account: {
        active: ["فعال", "success"],

        deactivated: ["غیرفعال‌شده", "warning"],

        suspended: ["تعلیق‌شده", "danger"],
      },
    };

    const [label, cls] = maps[type]?.[value] || [value || "—", "info"];

    return `
          <span class="badge ${cls}">
            ${escape(label)}
          </span>
        `;
  };

  return {
    request,
    qs,
    money,
    number,
    date,
    escape,
    badge,
    errorMessage,
  };
})();
