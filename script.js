// Build the email links at runtime, so the address is not sitting in the HTML for spam scrapers.
document.querySelectorAll("[data-email-user]").forEach((link) => {
  const address = `${link.dataset.emailUser}@${link.dataset.emailDomain}`;
  link.href = `mailto:${address}`;
  if (!link.textContent.trim()) link.textContent = address;
});

// Keep the footer year current.
const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());
