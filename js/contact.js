document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("member4-contact-form");
    const feedback = document.getElementById("contact-feedback");

    if (!form || !feedback) {
        return;
    }

    function showFeedback(message, type) {
        feedback.textContent = message;
        feedback.className = type;
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("contact-name").value.trim();
        const email = document.getElementById("contact-email").value.trim();
        const subject = document.getElementById("contact-subject").value;
        const message = document.getElementById("contact-message").value.trim();

        if (!name || !email || !subject || !message) {
            showFeedback("Please complete all fields.", "error");
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            showFeedback("Please enter a valid email address.", "error");
            return;
        }

        if (message.length < 10) {
            showFeedback(
                "Your message must contain at least 10 characters.",
                "error"
            );
            return;
        }

        showFeedback(
            `Thank you, ${name}! Your form has been completed successfully. This is a demo; no message was sent.`,
            "success"
        );

        form.reset();
    });

    form.addEventListener("input", function () {
        feedback.textContent = "";
        feedback.className = "";
    });
});
