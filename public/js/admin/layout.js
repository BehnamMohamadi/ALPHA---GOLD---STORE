document.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById("menuToggle");
  const sidebar = document.getElementById("adminSidebar");
  const sidebarCloseButton = document.getElementById("sidebarCloseButton");

  let backdrop = document.querySelector(".admin-sidebar-backdrop");

  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "admin-sidebar-backdrop";
    document.body.appendChild(backdrop);
  }

  const openSidebar = () => {
    sidebar?.classList.add("open");
    backdrop.classList.add("show");
    document.body.classList.add("sidebar-open");
  };

  const closeSidebar = () => {
    sidebar?.classList.remove("open");
    backdrop.classList.remove("show");
    document.body.classList.remove("sidebar-open");
  };

  menu?.addEventListener("click", () => {
    if (sidebar?.classList.contains("open")) closeSidebar();
    else openSidebar();
  });

  backdrop.addEventListener("click", closeSidebar);
  sidebarCloseButton?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 992) closeSidebar();
  });

  document.querySelectorAll(".admin-nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 992) closeSidebar();
    });
  });

  document.getElementById("logoutButton")?.addEventListener("click", async () => {
    try {
      await AdminAPI.request("/api/auth/logout", { method: "POST" });
    } finally {
      location.href = "/login";
    }
  });
});

window.adminToast = (message, type = "ok") => {
  const toast = document.getElementById("adminToast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = type === "error" ? "#ef776c" : "#e0ad50";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
};

window.adminConfirm = (text, title = "تأیید عملیات") => new Promise((resolve) => {
  const modal = document.getElementById("adminConfirm");
  const titleEl = document.getElementById("confirmTitle");
  const textEl = document.getElementById("confirmText");
  const ok = document.getElementById("confirmOk");
  const cancel = document.getElementById("confirmCancel");

  if (!modal) return resolve(confirm(text));

  titleEl.textContent = title;
  textEl.textContent = text;
  const previousFocus = document.activeElement;
  modal.classList.remove("hidden");
  cancel.focus();
  const onKey = event => { if(event.key === "Escape") { event.preventDefault(); done(false); } if(event.key === "Tab") { event.preventDefault(); (document.activeElement === cancel ? ok : cancel).focus(); } };
  modal.addEventListener("keydown", onKey);

  const done = (value) => {
    modal.classList.add("hidden");
    modal.removeEventListener("keydown", onKey);
    previousFocus?.focus();
    ok.onclick = null;
    cancel.onclick = null;
    resolve(value);
  };

  ok.onclick = () => done(true);
  cancel.onclick = () => done(false);
});
