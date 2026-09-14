const setText = (
  id,
  value,
) => {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
};

const loadDashboard =
  async () => {
    try {
      const payload =
        await AdminAPI.request(
          "/api/admin/dashboard",
        );

      const dashboard =
        payload?.data
          ?.dashboard || {};

      const users =
        dashboard.users || {};

      const products =
        dashboard.products || {};

      const orders =
        dashboard.orders || {};

      setText(
        "metricSales",
        AdminAPI.money(
          dashboard.sales
            ?.paidTotal || 0,
        ),
      );

      setText(
        "metricOrders",
        AdminAPI.number(
          orders.total || 0,
        ),
      );

      setText(
        "metricOrdersSub",
        `${AdminAPI.number(
          orders.pending || 0,
        )} در انتظار • ${AdminAPI.number(
          orders.paid || 0,
        )} پرداخت‌شده`,
      );

      setText(
        "metricProducts",
        AdminAPI.number(
          products.total || 0,
        ),
      );

      setText(
        "metricProductsSub",
        `${AdminAPI.number(
          products.active || 0,
        )} فعال • ${AdminAPI.number(
          products.inactive || 0,
        )} غیرفعال`,
      );

      setText(
        "metricUsers",
        AdminAPI.number(
          users.total || 0,
        ),
      );

      setText(
        "metricUsersSub",
        `${AdminAPI.number(
          users.active || 0,
        )} حساب فعال`,
      );

      setText(
        "metricCarts",
        AdminAPI.number(
          dashboard.carts?.total ||
            0,
        ),
      );

      setText(
        "activeUsers",
        AdminAPI.number(
          users.active || 0,
        ),
      );

      setText(
        "pendingOrders",
        AdminAPI.number(
          orders.pending || 0,
        ),
      );

      setText(
        "unpaidOrders",
        AdminAPI.number(
          orders.unpaid || 0,
        ),
      );

      setText(
        "inactiveProducts",
        AdminAPI.number(
          products.inactive ||
            0,
        ),
      );

      const latestOrders =
        dashboard.latestOrders ||
        [];

      document.getElementById(
        "latestOrdersBody",
      ).innerHTML =
        latestOrders.length
          ? latestOrders
              .map(
                (order) => `
                  <tr>
                    <td>
                      <a
                        class="text-link"
                        href="/admin/orders/${order._id}"
                      >
                        ${AdminAPI.escape(
                          order.orderNumber,
                        )}
                      </a>
                    </td>

                    <td>
                      ${AdminAPI.escape(
                        `${order.user?.firstname || ""} ${order.user?.lastname || ""}`.trim() ||
                          "—",
                      )}
                    </td>

                    <td>
                      ${AdminAPI.money(
                        order.totalAmount,
                      )}
                    </td>

                    <td>
                      ${AdminAPI.badge(
                        order.status,
                        "order",
                      )}
                    </td>

                    <td>
                      ${AdminAPI.badge(
                        order.paymentStatus,
                        "payment",
                      )}
                    </td>
                  </tr>
                `,
              )
              .join("")
          : `
            <tr>
              <td colspan="5">
                سفارشی ثبت نشده است.
              </td>
            </tr>
          `;

      const lowStock =
        products.lowStock || [];

      document.getElementById(
        "lowStockList",
      ).innerHTML =
        lowStock.length
          ? lowStock
              .map(
                (product) => `
                  <a
                    class="compact-item"
                    href="/admin/products/${product._id}/edit"
                  >
                    <img
                      class="compact-image"
                      src="${AdminAPI.escape(
                        product.coverImage || "",
                      )}"
                      alt=""
                    >

                    <div>
                      <b>
                        ${AdminAPI.escape(
                          product.name,
                        )}
                      </b>

                      <small>
                        ${AdminAPI.escape(
                          product.sku,
                        )}
                        •
                        ${AdminAPI.number(
                          product.goldWeight,
                        )}
                        گرم
                      </small>
                    </div>

                    <span class="badge warning">
                      موجودی
                      ${AdminAPI.number(
                        product.stock,
                      )}
                    </span>
                  </a>
                `,
              )
              .join("")
          : `
            <div class="note-box small">
              محصول کم‌موجودی وجود ندارد.
            </div>
          `;

      const pricing =
        dashboard.goldPricing;

      if (pricing) {
        setText(
          "gold18",
          AdminAPI.money(
            pricing.prices
              ?.gold18,
          ),
        );

        setText(
          "gold21",
          AdminAPI.money(
            pricing.prices
              ?.gold21,
          ),
        );

        setText(
          "gold22",
          AdminAPI.money(
            pricing.prices
              ?.gold22,
          ),
        );

        setText(
          "gold24",
          AdminAPI.money(
            pricing.prices
              ?.gold24,
          ),
        );

        setText(
          "profitPercent",
          `${pricing.profitPercent ?? "—"}٪`,
        );

        setText(
          "taxPercent",
          `${pricing.taxPercent ?? "—"}٪`,
        );

        setText(
          "pricingUpdatedAt",
          AdminAPI.date(
            pricing.updatedAt,
          ),
        );
      }
    } catch (error) {
      adminToast(
        error.message,
        "error",
      );
    }
  };

loadDashboard();
