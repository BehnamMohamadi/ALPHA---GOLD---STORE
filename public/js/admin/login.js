const form = document.getElementById("adminLoginForm");
const errorBox = document.getElementById("loginError");

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorBox?.classList.add("hidden");

    const body = Object.fromEntries(new FormData(form).entries());
    const submitButton = form.querySelector('button[type="submit"], button:not([type])');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "در حال ورود...";
    }

    try {
      const payload = await AdminAPI.request("/api/auth/login", {
        method: "POST",
        body,
      });

      if (payload?.data?.user?.role !== "admin") {
        await AdminAPI.request("/api/auth/logout", { method: "POST" });
        throw new Error("این حساب دسترسی ادمین ندارد.");
      }

      location.replace("/admin");
    } catch (error) {
      if (error.status === 409 && /already logged in/i.test(error.message || "")) {
        // A valid cookie already exists. Let the protected admin route decide.
        location.replace("/admin");
        return;
      }

      if (errorBox) {
        errorBox.textContent = error.message || "ورود ناموفق بود.";
        errorBox.classList.remove("hidden");
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "ورود به پنل";
      }
    }
  });
}
