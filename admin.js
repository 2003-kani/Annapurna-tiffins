document.addEventListener('DOMContentLoaded', () => {
  const ordersBody = document.getElementById('ordersBody');
  const refreshBtn = document.getElementById('refreshBtn');
  const errorMessage = document.getElementById('errorMessage');

  // Determine API base URL (works locally and on Vercel)
  const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:4000' 
    : '';

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const getStatusClass = (status) => `status-${status}`;

  async function fetchOrders() {
    errorMessage.textContent = '';
    ordersBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading orders...</td></tr>';
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`);
      const data = await response.json();

      if (!data.ok) throw new Error(data.message || 'Failed to fetch orders');

      if (data.orders.length === 0) {
        ordersBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No orders found.</td></tr>';
        return;
      }

      ordersBody.innerHTML = data.orders.map(order => `
        <tr>
          <td><strong>#${order.id}</strong></td>
          <td>
            <strong>${order.customer_name}</strong><br>
            <small>📞 ${order.customer_phone}</small><br>
            <small>📍 ${order.customer_address}</small>
          </td>
          <td>
            <ul class="item-list">
              ${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}
            </ul>
          </td>
          <td><strong>₹${order.total_amount}</strong></td>
          <td><small>${formatTime(order.created_at)}</small></td>
          <td>
            <select class="status-select ${getStatusClass(order.status)}" data-order-id="${order.id}">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
              <option value="out_for_delivery" ${order.status === 'out_for_delivery' ? 'selected' : ''}>Out for Delivery</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
        </tr>
      `).join('');

      // Add event listeners to dropdowns
      document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', handleStatusChange);
      });

    } catch (error) {
      console.error(error);
      errorMessage.textContent = 'Error: ' + error.message;
      ordersBody.innerHTML = '';
    }
  }

  async function handleStatusChange(event) {
    const select = event.target;
    const orderId = select.getAttribute('data-order-id');
    const newStatus = select.value;

    select.disabled = true;
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();

      if (!data.ok) throw new Error(data.message);

      // Update color class
      select.className = `status-select ${getStatusClass(newStatus)}`;
    } catch (error) {
      console.error(error);
      alert('Failed to update status: ' + error.message);
      // Revert select visually (optional, just fetch again is easier)
      fetchOrders();
    } finally {
      select.disabled = false;
    }
  }

  refreshBtn.addEventListener('click', fetchOrders);
  
  // Initial fetch
  fetchOrders();
});
