document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("member4-login-form");
    const registerForm = document.getElementById("member4-register-form");

    const loginTab = document.getElementById("login-tab");
    const registerTab = document.getElementById("register-tab");

    const goRegister = document.getElementById("go-register");
    const goLogin = document.getElementById("go-login");

    const heading = document.getElementById("account-heading");
    const description = document.getElementById("account-description");
    const feedback = document.getElementById("account-feedback");

    if (!loginForm || !registerForm || !feedback) {
        return;
    }

    function showFeedback(message, type) {
        feedback.textContent = message;
        feedback.className = type;
    }

    function clearFeedback() {
        feedback.textContent = "";
        feedback.className = "";
    }

    function resetPasswordVisibility() {
        document.querySelectorAll(".toggle-password").forEach(function (button) {
            const input = document.getElementById(button.dataset.target);

            if (input) {
                input.type = "password";
                button.textContent = "Show";
                button.setAttribute("aria-label", "Show password");
            }
        });
    }

    function showLogin() {
        loginForm.hidden = false;
        registerForm.hidden = true;

        loginTab.classList.add("active");
        registerTab.classList.remove("active");

        loginTab.setAttribute("aria-pressed", "true");
        registerTab.setAttribute("aria-pressed", "false");

        heading.textContent = "Welcome back.";
        description.textContent = "A little closer to your next favorite outfit.";

        clearFeedback();
        resetPasswordVisibility();
    }

    function showRegister() {
        loginForm.hidden = true;
        registerForm.hidden = false;

        loginTab.classList.remove("active");
        registerTab.classList.add("active");

        loginTab.setAttribute("aria-pressed", "false");
        registerTab.setAttribute("aria-pressed", "true");

        heading.textContent = "Join us.";
        description.textContent = "Discover a style that feels like you.";

        clearFeedback();
        resetPasswordVisibility();
    }

    loginTab.addEventListener("click", showLogin);
    registerTab.addEventListener("click", showRegister);

    goRegister.addEventListener("click", showRegister);
    goLogin.addEventListener("click", showLogin);

    document.querySelectorAll(".toggle-password").forEach(function (button) {
        button.addEventListener("click", function () {
            const input = document.getElementById(button.dataset.target);

            if (!input) {
                return;
            }

            if (input.type === "password") {
                input.type = "text";
                button.textContent = "Hide";
                button.setAttribute("aria-label", "Hide password");
            } else {
                input.type = "password";
                button.textContent = "Show";
                button.setAttribute("aria-label", "Show password");
            }
        });
    });

    registerForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("register-name").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (!name || !email || !password || !confirmPassword) {
            showFeedback("Please complete all fields.", "error");
            return;
        }

        if (password.length < 8) {
            showFeedback(
                "Password must contain at least 8 characters.",
                "error"
            );
            return;
        }

        if (password !== confirmPassword) {
            showFeedback("Passwords do not match.", "error");
            return;
        }

        registerForm.reset();

        showLogin();

        document.getElementById("login-email").value = email;

        showFeedback(
            `Welcome, ${name}! Your registration form has been validated. This is a demo; no real account was created.`,
            "success"
        );
    });

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        if (!email || !password) {
            showFeedback("Please enter your email and password.", "error");
            return;
        }

        if (password.length < 8) {
            showFeedback(
                "Password must contain at least 8 characters.",
                "error"
            );
            return;
        }

        showFeedback(
            "Your sign-in form has been validated. This is a frontend demonstration, not an authenticated session.",
            "success"
        );

        loginForm.reset();
        resetPasswordVisibility();
    });

    loginForm.addEventListener("input", clearFeedback);
    registerForm.addEventListener("input", clearFeedback);

    showLogin();
});
