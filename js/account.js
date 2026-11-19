
document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("member4-login-form");
    const registerForm = document.getElementById("member4-register-form");

    const loginTab = document.getElementById("login-tab");
    const registerTab = document.getElementById("register-tab");

    const goRegister = document.getElementById("go-register");
    const goLogin = document.getElementById("go-login");

    const feedback = document.getElementById("account-feedback");

    if (!loginForm || !registerForm) {
        return;
    }

    function showMessage(message, type) {
        feedback.textContent = message;
        feedback.className = type;
    }

    function clearMessage() {
        feedback.textContent = "";
        feedback.className = "";
    }

    function showLogin() {
        loginForm.hidden = false;
        registerForm.hidden = true;

        loginTab.classList.add("active");
        registerTab.classList.remove("active");

        loginTab.setAttribute("aria-pressed", "true");
        registerTab.setAttribute("aria-pressed", "false");

        clearMessage();
    }

    function showRegister() {
        loginForm.hidden = true;
        registerForm.hidden = false;

        loginTab.classList.remove("active");
        registerTab.classList.add("active");

        loginTab.setAttribute("aria-pressed", "false");
        registerTab.setAttribute("aria-pressed", "true");

        clearMessage();
    }

    loginTab.addEventListener("click", showLogin);
    registerTab.addEventListener("click", showRegister);

    goRegister.addEventListener("click", showRegister);
    goLogin.addEventListener("click", showLogin);

    document.querySelectorAll(".toggle-password").forEach(function (button) {
        button.addEventListener("click", function () {
            const passwordInput = document.getElementById(button.dataset.target);

            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                button.textContent = "Hide";
            } else {
                passwordInput.type = "password";
                button.textContent = "Show";
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
            showMessage("Please complete all fields.", "error");
            return;
        }

        if (password.length < 8) {
            showMessage("Password must contain at least 8 characters.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.", "error");
            return;
        }

        registerForm.reset();

        showLogin();

        document.getElementById("login-email").value = email;

        showMessage(
            "Registration form validated successfully! This is a demo. No actual account was created.",
            "success"
        );
    });

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        if (!email || !password) {
            showMessage("Please enter your email and password.", "error");
            return;
        }

        if (password.length < 8) {
            showMessage("Password must contain at least 8 characters.", "error");
            return;
        }

        showMessage(
            "Login form validated successfully! This is a frontend demonstration, not an authenticated session.",
            "success"
        );

        loginForm.reset();
    });

    showLogin();
});
