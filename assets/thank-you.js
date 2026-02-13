const ORDER_KEY = "sourdough-last-order";
const recap = document.getElementById("order-recap");
const emailStatus = document.getElementById("email-status");

function renderFallback() {
  emailStatus.textContent = "Vi har tagit emot din order.";
  recap.innerHTML = `
    <p>Orderdetaljer kunde inte laddas.</p>
    <p class="cart-item__meta">Om du precis beställt ska du få ett mejl inom några minuter.</p>
  `;
}

try {
  const raw = sessionStorage.getItem(ORDER_KEY);
  if (!raw) {
    renderFallback();
  } else {
    const order = JSON.parse(raw);
    recap.innerHTML = `
      <p><strong>Ordernummer:</strong> ${order.orderNumber || "-"}</p>
      <p><strong>Kund:</strong> ${order.name}</p>
      <p><strong>E-post:</strong> ${order.email}</p>
      <p><strong>Produkt:</strong> ${order.bread}</p>
      <p><strong>Antal:</strong> ${order.quantity}</p>
      <p><strong>Totalt:</strong> ${order.total} kr</p>
    `;
    emailStatus.textContent = order.emailSent
      ? "Bekräftelse skickad till din e-post."
      : "Ordern är mottagen. E-post är inte aktiverad ännu.";
    sessionStorage.removeItem(ORDER_KEY);
  }
} catch {
  renderFallback();
}
