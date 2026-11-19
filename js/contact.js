
document.addEventListener("DOMContentLoaded", function () {
    const contactForm = document.getElementById("member4-contact-form");
    const feedback = document.getElementById("contact-feedback");

    if (!contactForm || !feedback) {
        return;
    }

    contactForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("contact-name").value.trim();
        const email = document.getElementById("contact-email").value.trim();
        const subject = document.getElementById("contact-subject").value;
        const message = document.getElementById("contact-message").value.trim();

        if (!name || !email || !subject || !message) {
            feedback.textContent = "Please complete all required fields.";
            feedback.className = "error";
            return;
        }

        if (message.length < 10) {
            feedback.textContent = "Your message must contain at least 10 characters.";
            feedback.className = "error";
            return;
        }

        feedback.textContent =
            "Thank you, " + name + "! Your form has been successfully validated. This is a demo; no message was sent.";

        feedback.className = "success";

        contactForm.reset();
    });
});
