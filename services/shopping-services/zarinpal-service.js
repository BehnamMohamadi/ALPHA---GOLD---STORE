const { AppError } = require("../../utils/app-error");

const REQUEST_TIMEOUT_MS = 10000;

const isSandbox = () =>
  String(process.env.ZARINPAL_SANDBOX || "false").toLowerCase() === "true";

const getUrls = () => {
  if (isSandbox()) {
    return {
      request: "https://sandbox.zarinpal.com/pg/v4/payment/request.json",

      verify: "https://sandbox.zarinpal.com/pg/v4/payment/verify.json",

      start: "https://sandbox.zarinpal.com/pg/StartPay/",
    };
  }

  return {
    request: "https://api.zarinpal.com/pg/v4/payment/request.json",

    verify: "https://api.zarinpal.com/pg/v4/payment/verify.json",

    start: "https://www.zarinpal.com/pg/StartPay/",
  };
};

const getMerchantId = () => {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();

  if (!merchantId) {
    throw new AppError(500, "zarinpal merchant id is not configured");
  }

  return merchantId;
};

const postJson = async (url, body) => {
  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify(body),

      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new AppError(502, "payment gateway request failed");
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new AppError(504, "payment gateway request timed out");
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, "payment gateway is not available");
  } finally {
    clearTimeout(timeout);
  }
};

const requestPayment = async ({ amount, callbackUrl, description, mobile, email }) => {
  const urls = getUrls();

  const metadata = {};

  if (mobile) {
    metadata.mobile = mobile;
  }

  if (email) {
    metadata.email = email;
  }

  const payload = await postJson(urls.request, {
    merchant_id: getMerchantId(),

    amount,

    callback_url: callbackUrl,

    description,

    metadata,
  });

  const data = payload?.data;

  if (!data || data.code !== 100 || !data.authority) {
    const message =
      payload?.errors?.message || data?.message || "payment request was rejected";

    throw new AppError(502, message);
  }

  return {
    code: data.code,

    authority: data.authority,

    redirectUrl: `${urls.start}${data.authority}`,
  };
};

const verifyPayment = async ({ amount, authority }) => {
  const urls = getUrls();

  const payload = await postJson(urls.verify, {
    merchant_id: getMerchantId(),

    amount,

    authority,
  });

  const data = payload?.data;

  if (!data || ![100, 101].includes(data.code)) {
    const message =
      payload?.errors?.message || data?.message || "payment verification failed";

    throw new AppError(402, message);
  }

  return {
    code: data.code,

    referenceId: data.ref_id ? String(data.ref_id) : null,

    cardPan: data.card_pan || null,

    cardHash: data.card_hash || null,

    alreadyVerified: data.code === 101,
  };
};

module.exports = {
  requestPayment,
  verifyPayment,
};
