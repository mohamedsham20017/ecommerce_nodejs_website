const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/auth"); // create this middleware
const Order = require("../models/Order");

// Show purchase form
router.get("/", requiresAuth, (req, res) => {
  res.send(`
    <h1>Purchase Form</h1>
    <form action="/purchase" method="POST">
      <label>Date of Purchase:</label>
      <input type="date" name="date" required><br>

      <label>Delivery Time:</label>
      <select name="time">
        <option value="10 AM">10 AM</option>
        <option value="11 AM">11 AM</option>
        <option value="12 PM">12 PM</option>
      </select><br>

      <label>Delivery Location:</label>
      <select name="location">
        <option value="Colombo">Colombo</option>
        <option value="Galle">Galle</option>
        <option value="Kandy">Kandy</option>
      </select><br>

      <label>Product:</label>
      <select name="product">
        <option value="Phone">Phone</option>
        <option value="Laptop">Laptop</option>
        <option value="Tablet">Tablet</option>
      </select><br>

      <label>Quantity:</label>
      <input type="number" name="quantity" min="1" required><br>

      <label>Message:</label>
      <input type="text" name="message"><br>

      <button type="submit">Submit Order</button>
    </form>
  `);
});

// Handle form submission
router.post("/", requiresAuth, express.urlencoded({ extended: true }), async (req, res) => {
  const user = req.user; // Passport user
  const selectedDate = new Date(req.body.date);
  const today = new Date();
  today.setHours(0,0,0,0);

  if (selectedDate < today) return res.send('You cannot select a past date!');
  if (selectedDate.getDay() === 0) return res.send('You cannot select Sunday!');

  const order = new Order({
    username: user.username || user.name,
    email: user.email,
    date: req.body.date,
    time: req.body.time,
    location: req.body.location,
    product: req.body.product,
    quantity: req.body.quantity,
    message: req.body.message
  });

  await order.save();
  res.send(`<h1>Order Confirmed!</h1><a href="/purchase/myorders">View My Orders</a>`);
});

// Show user's orders
router.get("/myorders", requiresAuth, async (req, res) => {
  const user = req.user;
  const orders = await Order.find({ username: user.username || user.name });
  let html = "<h1>My Orders</h1>";
  if (orders.length === 0) html += "<p>No orders yet.</p>";
  else {
    orders.forEach(o => {
      html += `
        <div style="border:1px solid #000; margin:10px; padding:5px;">
          <p>Product: ${o.product}</p>
          <p>Date: ${o.date}</p>
          <p>Time: ${o.time}</p>
          <p>Location: ${o.location}</p>
          <p>Quantity: ${o.quantity}</p>
          <p>Message: ${o.message}</p>
        </div>
      `;
    });
  }
  html += '<a href="/purchase">Make Another Order</a>';
  res.send(html);
});

module.exports = router;
