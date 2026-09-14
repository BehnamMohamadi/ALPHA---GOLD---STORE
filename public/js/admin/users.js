let userPage = 1;
let userPages = 1;
let users = [];

const accountBadge = (status) =>
  AdminAPI.badge(
    status,
    "account",
  );

const renderPagination = () => {
  const host =
    document.getElementById(
      "usersPagination",
    );

  host.innerHTML = `
    <span>
      صفحه
      ${AdminAPI.number(userPage)}
      از
      ${AdminAPI.number(userPages)}
    </span>

    <div class="page-buttons">
      <button
        data-page="${userPage - 1}"
        ${userPage <= 1 ? "disabled" : ""}
      >‹</button>

      <button class="active">
        ${AdminAPI.number(userPage)}
      </button>

      <button
        data-page="${userPage + 1}"
        ${userPage >= userPages ? "disabled" : ""}
      >›</button>
    </div>
  `;

  host
    .querySelectorAll("[data-page]")
    .forEach((button) => {
      button.onclick = () => {
        userPage =
          Number(
            button.dataset.page,
          );

        loadUsers();
      };
    });
};

const renderUsers = () => {
  const query =
    document
      .getElementById(
        "userSearch",
      )
      .value
      .trim()
      .toLowerCase();

  const filtered =
    query
      ? users.filter((user) =>
          [
            user.firstname,
            user.lastname,
            user.phonenumber,
            user.email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : users;

  document.getElementById(
    "usersBody",
  ).innerHTML =
    filtered.length
      ? filtered
          .map(
            (user) => `
              <tr>
                <td>
                  <div class="product-cell">
                    <div
                      class="avatar table-avatar"
                      dir="ltr"
                    >
                      ${AdminAPI.escape(
                        `${user.firstname?.charAt(0) || ""}${user.lastname?.charAt(0) || ""}`.toUpperCase(),
                      )}
                    </div>

                    <div>
                      <b>
                        ${AdminAPI.escape(
                          `${user.firstname} ${user.lastname}`,
                        )}
                      </b>

                      <small>
                        ${AdminAPI.escape(
                          user.email || "—",
                        )}
                      </small>
                    </div>
                  </div>
                </td>

                <td>
                  ${AdminAPI.escape(
                    user.phonenumber,
                  )}
                </td>

                <td>
                  <span
                    class="badge ${
                      user.role === "admin"
                        ? "warning"
                        : "info"
                    }"
                  >
                    ${
                      user.role === "admin"
                        ? "ادمین"
                        : "کاربر"
                    }
                  </span>
                </td>

                <td>
                  ${accountBadge(
                    user.accountStatus
                      ?.status ||
                      "active",
                  )}
                </td>

                <td>
                  ${AdminAPI.date(
                    user.createdAt,
                  )}
                </td>

                <td>
                  <button
                    class="table-btn"
                    data-manage-user="${user._id}"
                  >
                    مدیریت
                  </button>
                </td>
              </tr>
            `,
          )
          .join("")
      : `
        <tr>
          <td colspan="6">
            کاربری پیدا نشد.
          </td>
        </tr>
      `;

  document
    .querySelectorAll(
      "[data-manage-user]",
    )
    .forEach((button) => {
      button.onclick = () =>
        openUserEditor(
          button.dataset.manageUser,
        );
    });
};

const loadUsers = async () => {
  const params = {
    page: userPage,
    limit: 15,
    sort: "-createdAt",
    role:
      document.getElementById(
        "userRoleFilter",
      ).value,

    "accountStatus.status":
      document.getElementById(
        "userStatusFilter",
      ).value,
  };

  try {
    const payload =
      await AdminAPI.request(
        `/api/users${AdminAPI.qs(
          params,
        )}`,
      );

    users =
      payload?.data?.users || [];

    userPages =
      payload?.totalPages || 1;

    renderUsers();
    renderPagination();
  } catch (error) {
    adminToast(
      error.message,
      "error",
    );
  }
};

const renderAddresses = (
  addresses,
) => {
  const host =
    document.getElementById(
      "userAddresses",
    );

  host.innerHTML =
    addresses.length
      ? addresses
          .map(
            (address) => `
              <article class="address-admin-card">
                <div class="address-card-head">
                  <b>
                    ${AdminAPI.escape(
                      address.title,
                    )}
                  </b>

                  ${
                    address.isDefault
                      ? `
                        <span class="badge warning">
                          پیش‌فرض
                        </span>
                      `
                      : ""
                  }
                </div>

                <strong>
                  ${AdminAPI.escape(
                    address.recipientName,
                  )}
                </strong>

                <span>
                  ${AdminAPI.escape(
                    address.recipientPhone,
                  )}
                </span>

                <p>
                  ${AdminAPI.escape(
                    `${address.province}، ${address.city}، ${address.addressLine}`,
                  )}
                </p>

                <div class="address-meta-row">
                  <small>
                    کد پستی:
                    ${AdminAPI.escape(
                      address.postalCode,
                    )}
                  </small>

                  ${
                    address.buildingNumber
                      ? `
                        <small>
                          پلاک:
                          ${AdminAPI.escape(
                            address.buildingNumber,
                          )}
                        </small>
                      `
                      : ""
                  }

                  ${
                    address.unit
                      ? `
                        <small>
                          واحد:
                          ${AdminAPI.escape(
                            address.unit,
                          )}
                        </small>
                      `
                      : ""
                  }
                </div>
              </article>
            `,
          )
          .join("")
      : `
        <div class="note-box small">
          این کاربر هنوز آدرسی ذخیره نکرده است.
        </div>
      `;
};

const loadUserAddresses =
  async (userId) => {
    const host =
      document.getElementById(
        "userAddresses",
      );

    host.innerHTML = `
      <div class="note-box small">
        در حال دریافت آدرس‌ها...
      </div>
    `;

    try {
      const payload =
        await AdminAPI.request(
          `/api/addresses/admin/user/${userId}`,
        );

      renderAddresses(
        payload?.data
          ?.addresses || [],
      );
    } catch (error) {
      host.innerHTML = `
        <div class="note-box small">
          ${AdminAPI.escape(
            error.message,
          )}
        </div>
      `;
    }
  };

const openUserEditor =
  async (userId) => {
    let user =
      users.find(
        (item) =>
          item._id === userId,
      );

    try {
      const payload =
        await AdminAPI.request(
          `/api/users/${userId}`,
        );

      user =
        payload?.data?.user ||
        user;
    } catch {
      // The table object is enough if the detail request fails.
    }

    if (!user) return;

    const form =
      document.getElementById(
        "userEditForm",
      );

    form.elements.userId.value =
      user._id;

    form.elements.firstname.value =
      user.firstname || "";

    form.elements.lastname.value =
      user.lastname || "";

    form.elements.phonenumber.value =
      user.phonenumber || "";

    form.elements.email.value =
      user.email || "";

    form.elements.role.value =
      user.role || "user";

    form.elements.accountStatus.value =
      user.accountStatus?.status ||
      "active";

    document.getElementById(
      "editingUserLabel",
    ).textContent =
      `${user.firstname} ${user.lastname}`;

    document
      .getElementById("userEditor")
      .classList.remove("hidden");

    document
      .getElementById("userEditor")
      .scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

    await loadUserAddresses(
      user._id,
    );
  };

document
  .getElementById("userEditForm")
  .addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const form =
        event.currentTarget;

      const status =
        form.elements
          .accountStatus.value;

      const body = {
        firstname:
          form.elements
            .firstname.value.trim(),

        lastname:
          form.elements
            .lastname.value.trim(),

        phonenumber:
          form.elements
            .phonenumber.value.trim(),

        email:
          form.elements
            .email.value.trim(),

        role:
          form.elements.role.value,

        accountStatus:
          status === "active"
            ? {
                status: "active",
                reason: null,
              }
            : {
                status,
                reason:
                  status ===
                  "suspended"
                    ? "security"
                    : "admin_deactivated",
              },
      };

      const button =
        document.getElementById(
          "saveUserButton",
        );

      button.disabled = true;

      try {
        await AdminAPI.request(
          `/api/users/${form.elements.userId.value}`,
          {
            method: "PATCH",
            body,
          },
        );

        adminToast(
          "اطلاعات کاربر بروزرسانی شد.",
        );

        await loadUsers();

        document
          .getElementById(
            "userEditor",
          )
          .classList.add(
            "hidden",
          );
      } catch (error) {
        adminToast(
          error.message,
          "error",
        );
      } finally {
        button.disabled = false;
      }
    },
  );

document.getElementById(
  "closeUserEditor",
).onclick = () => {
  document
    .getElementById("userEditor")
    .classList.add("hidden");
};

document
  .getElementById("userSearch")
  .addEventListener(
    "input",
    renderUsers,
  );

[
  "userRoleFilter",
  "userStatusFilter",
].forEach((id) => {
  document
    .getElementById(id)
    .addEventListener(
      "change",
      () => {
        userPage = 1;
        loadUsers();
      },
    );
});

loadUsers();
