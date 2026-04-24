(function () {
  const PRICE_PER_ITEM = 45;
  const MIN_ORDER_AMOUNT = 100;
  const PHONE = "916281110993";
  let pendingOrder = null;

  const menuAliases = {
    idli: "Idli",
    vada: "Vada",
    puri: "Puri",
    bonda: "Bonda",
    "masala dosa": "Masala Dosa",
    "onion dosa": "Onion Dosa",
    uthappam: "Uthappam",
    "set dosa": "Set Dosa"
  };

  function createWidget() {
    const wrap = document.createElement("div");
    wrap.className = "chatbot-wrap";
    wrap.innerHTML = `
      <button class="chatbot-toggle" aria-label="Open order assistant" title="Open order assistant">🤖</button>
      <div class="chatbot-panel" aria-hidden="true">
        <div class="chatbot-header">
          <span>Order Assistant</span>
          <button type="button" class="chatbot-close" aria-label="Close order assistant">×</button>
        </div>
        <div class="chatbot-messages" id="chatbotMessages">
          <p><strong>Bot:</strong> Hi! Type like: <em>order 2 idli and 1 vada</em></p>
          <p><strong>Bot:</strong> Then I will ask Name, Phone, and Address to place WhatsApp order.</p>
        </div>
        <form class="chatbot-customer-form" id="chatbotCustomerForm" hidden>
          <input id="chatName" type="text" placeholder="Your name" required>
          <input id="chatPhone" type="tel" placeholder="10-digit phone" pattern="[0-9]{10}" required>
          <textarea id="chatAddress" placeholder="Delivery address (Gopalpur, Hanamkonda)" rows="2" required></textarea>
          <button type="submit">Place Order on WhatsApp</button>
        </form>
        <form class="chatbot-input-row" id="chatbotForm">
          <input id="chatbotInput" type="text" placeholder="Type your order command..." autocomplete="off" required>
          <button type="submit">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(wrap);

    const toggleBtn = wrap.querySelector(".chatbot-toggle");
    const panel = wrap.querySelector(".chatbot-panel");
    const closeBtn = wrap.querySelector(".chatbot-close");
    const form = wrap.querySelector("#chatbotForm");
    const customerForm = wrap.querySelector("#chatbotCustomerForm");
    const input = wrap.querySelector("#chatbotInput");
    const messages = wrap.querySelector("#chatbotMessages");

    toggleBtn.addEventListener("click", function () {
      const isOpen = panel.classList.toggle("open");
      panel.setAttribute("aria-hidden", String(!isOpen));
      if (isOpen) input.focus();
    });

    closeBtn.addEventListener("click", function () {
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      pushMsg(messages, "You", text);
      input.value = "";
      handleOrderCommand(text, messages, customerForm);
    });

    customerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      submitWhatsAppOrder(messages, customerForm);
    });
  }

  function pushMsg(el, who, text) {
    const p = document.createElement("p");
    p.innerHTML = `<strong>${who}:</strong> ${text}`;
    el.appendChild(p);
    el.scrollTop = el.scrollHeight;
  }

  function parseItems(command) {
    const normalized = command.toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
    const found = [];
    Object.keys(menuAliases).forEach(function (alias) {
      const re = new RegExp(`(\\d+)\\s+${alias.replace(" ", "\\s+")}`, "i");
      const m = normalized.match(re);
      if (m) {
        found.push({ name: menuAliases[alias], qty: Number(m[1]) });
      }
    });
    return found;
  }

  function handleOrderCommand(command, messages, customerForm) {
    const items = parseItems(command);
    if (!items.length) {
      pushMsg(messages, "Bot", "I couldn't understand that. Example: order 2 idli and 1 vada.");
      return;
    }

    let total = 0;
    const lines = items.map(function (it) {
      const amount = it.qty * PRICE_PER_ITEM;
      total += amount;
      return `${it.name}: ${it.qty} plate(s) = Rs ${amount}`;
    });

    if (total <= MIN_ORDER_AMOUNT) {
      pushMsg(messages, "Bot", `Order total is Rs ${total}. Minimum online order is above Rs ${MIN_ORDER_AMOUNT}.`);
      return;
    }

    pendingOrder = { items, lines, total };
    customerForm.hidden = false;
    pushMsg(messages, "Bot", `Great. Order total is Rs ${total}. Please fill your details below to place order.`);
  }

  function submitWhatsAppOrder(messages, formEl) {
    if (!pendingOrder) {
      pushMsg(messages, "Bot", "Please enter your order first.");
      return;
    }

    const name = document.getElementById("chatName").value.trim();
    const phone = document.getElementById("chatPhone").value.trim();
    const address = document.getElementById("chatAddress").value.trim();
    if (!name || !phone || !address || !/^\d{10}$/.test(phone)) {
      pushMsg(messages, "Bot", "Please enter valid Name, 10-digit Phone, and Address.");
      return;
    }

    const message = [
      "Hi Annapurna Tiffins,",
      "",
      "I would like to place an order:",
      "",
      "--- ORDER DETAILS ---",
      ...pendingOrder.lines,
      "",
      "--- CUSTOMER DETAILS ---",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Address: ${address}`,
      "",
      "--- PAYMENT DETAILS ---",
      `Total Amount: Rs ${pendingOrder.total}`,
      "",
      "--- DELIVERY INFO ---",
      "Delivery Area: Gopalpur, Kux Road, Hanamkonda",
      "Estimated Delivery: 30-45 minutes",
      "",
      "Thank you!"
    ].join("\n");

    pushMsg(messages, "Bot", "Saving order in system and opening WhatsApp with your order format.");

    // Try backend API first (if server is running), fallback to WhatsApp-only flow.
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        address,
        orderSource: "chatbot",
        countryCode: "IN",
        currencyCode: "INR",
        items: pendingOrder.items
      })
    }).catch(function () {
      // Ignore API failure and continue WhatsApp order flow for now.
    });

    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`, "_blank");
    formEl.reset();
    formEl.hidden = true;
    pendingOrder = null;
  }

  document.addEventListener("DOMContentLoaded", createWidget);
})();
