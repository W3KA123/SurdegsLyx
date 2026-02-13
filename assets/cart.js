const CART_KEY = "sourdough-cart";
const ORDER_KEY = "sourdough-last-order";
const API_BASE = "";

const cartContent = document.getElementById("cart-content");
const orderSummaryInput = document.getElementById("order-summary");
const form = document.getElementById("checkout-form");
const formMessage = document.getElementById("form-message");
const submitButton = document.getElementById("submit-order");

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.name || !parsed?.price) return null;
    return { ...parsed, quantity: Math.max(1, Number(parsed.quantity || 1)) };
  } catch {
    return null;
  }
}

function setCart(item) {
  localStorage.setItem(CART_KEY, JSON.stringify(item));
}

function renderEmptyState() {
  cartContent.innerHTML = `
    <p>Din kundkorg är tom.</p>
    <p style="margin-top:0.8rem;"><a class="back-link" href="./index.html">Välj ett bröd först</a></p>
  `;
  form.style.display = "none";
}

function updateOrderFields(item) {
  const total = item.price * item.quantity;
  const summary = `${item.name} x ${item.quantity} - ${total} kr`;
  orderSummaryInput.value = summary;
}

function renderCart() {
  const item = getCart();
  if (!item) {
    renderEmptyState();
    return;
  }

  const total = item.price * item.quantity;
  cartContent.innerHTML = `
    <div class="cart-item">
      <p class="cart-item__name">${item.name}</p>
      <p class="cart-item__name">${total} kr</p>
      <p class="cart-item__meta">Pris per bröd: ${item.price} kr</p>
      <div class="qty-group" aria-label="Ändra antal">
        <button class="qty-btn" id="decrease-qty" type="button" aria-label="Minska antal">-</button>
        <p class="qty-value">${item.quantity}</p>
        <button class="qty-btn" id="increase-qty" type="button" aria-label="Öka antal">+</button>
      </div>
    </div>
    <p class="cart-total">Totalt: ${total} kr</p>
    <button class="button button--ghost" id="clear-cart" type="button">Ta bort från kundkorg</button>
  `;

  updateOrderFields(item);

  document.getElementById("decrease-qty").addEventListener("click", () => {
    const next = { ...item, quantity: Math.max(1, item.quantity - 1) };
    setCart(next);
    renderCart();
  });

  document.getElementById("increase-qty").addEventListener("click", () => {
    const next = { ...item, quantity: item.quantity + 1 };
    setCart(next);
    renderCart();
  });

  document.getElementById("clear-cart").addEventListener("click", () => {
    localStorage.removeItem(CART_KEY);
    renderEmptyState();
  });
}

renderCart();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const item = getCart();
  if (!item) {
    renderEmptyState();
    return;
  }
  formMessage.textContent = "Skickar beställning...";
  submitButton.disabled = true;
  const payload = {
    customer: {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
    },
    note: form.elements.message.value.trim(),
    item: {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.price * item.quantity,
    },
    summary: orderSummaryInput.value,
  };

  try {
    const response = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Kunde inte skicka formuläret.");
    }

    const data = await response.json();

    sessionStorage.setItem(
      ORDER_KEY,
      JSON.stringify({
        name: payload.customer.name,
        email: payload.customer.email,
        bread: payload.item.name,
        quantity: item.quantity,
        total: item.price * item.quantity,
        orderNumber: data.orderNumber,
        emailSent: data.emailSent,
      })
    );
    localStorage.removeItem(CART_KEY);
    window.location.href = "./thank-you.html";
  } catch (error) {
    formMessage.textContent = "Något gick fel. Kontrollera servern och försök igen.";
    submitButton.disabled = false;
  }
});
