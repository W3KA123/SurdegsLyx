const loadButton = document.getElementById("load-orders");
const adminKeyInput = document.getElementById("admin-key");
const adminMessage = document.getElementById("admin-message");
const ordersBody = document.getElementById("orders-body");
const ordersCount = document.getElementById("orders-count");
const ordersTotal = document.getElementById("orders-total");

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("sv-SE");
}

function renderRow(order) {
  return `
    <tr>
      <td>${formatDate(order.createdAt)}</td>
      <td>${order.orderNumber || "-"}</td>
      <td>
        ${order.customer?.name || "-"}<br />
        <span class="cart-item__meta">${order.customer?.email || "-"}<br />${order.customer?.phone || "-"}</span>
      </td>
      <td>${order.item?.name || "-"}</td>
      <td>${order.item?.quantity || "-"}</td>
      <td>${order.item?.total || 0} kr</td>
      <td>${order.note || "-"}</td>
    </tr>
  `;
}

async function loadOrders() {
  adminMessage.textContent = "Hämtar beställningar...";
  loadButton.disabled = true;

  try {
    const adminKey = adminKeyInput.value.trim();
    const query = adminKey ? `?adminKey=${encodeURIComponent(adminKey)}` : "";
    const response = await fetch(`/api/orders${query}`);

    if (!response.ok) {
      throw new Error("Kunde inte hämta beställningar.");
    }

    const data = await response.json();
    ordersCount.textContent = String(data.count ?? 0);
    ordersTotal.textContent = `${data.totalRevenue ?? 0} kr`;

    const rows = (data.orders || []).map(renderRow).join("");
    ordersBody.innerHTML = rows || '<tr><td colspan="7">Inga beställningar ännu.</td></tr>';
    adminMessage.textContent = "Klart.";
  } catch (error) {
    ordersBody.innerHTML = "";
    ordersCount.textContent = "-";
    ordersTotal.textContent = "-";
    adminMessage.textContent = "Kunde inte hämta beställningar. Kontrollera servern eller admin-nyckeln.";
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadOrders);
loadOrders();
