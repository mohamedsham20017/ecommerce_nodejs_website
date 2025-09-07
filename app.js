const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(csrf({ cookie: true }));

const escape = require('escape-html');

require('dotenv').config(); // Load .env
const express = require('express');
const { auth } = require('express-openid-connect'); // Auth0
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const createError = require('http-errors');
const MongoStore = require('connect-mongo')(session);

// Models
const Category = require('./models/category');
const Order = require('./models/Order');

// Routers
const indexRouter = require('./routes/index');
const productsRouter = require('./routes/products');
const usersRouter = require('./routes/user');
const pagesRouter = require('./routes/pages');
const adminRouter = require('./routes/admin');

// Database connection
const connectDB = require('./config/db');
connectDB();

// Initialize Express
const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    cookie: { maxAge: 60 * 60 * 1000 * 3 }, // 3 hours
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Global variables
app.use(async (req, res, next) => {
  try {
    res.locals.login = req.isAuthenticated();
    res.locals.session = req.session;
    res.locals.currentUser = req.user;
    const categories = await Category.find({}).sort({ title: 1 }).exec();
    res.locals.categories = categories;
    next();
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

// Breadcrumbs helper
const get_breadcrumbs = function (url) {
  const rtn = [{ name: 'Home', url: '/' }];
  let acc = '';
  const arr = url.substring(1).split('/');
  for (let i = 0; i < arr.length; i++) {
    acc = i != arr.length - 1 ? acc + '/' + arr[i] : null;
    rtn[i + 1] = {
      name: arr[i].charAt(0).toUpperCase() + arr[i].slice(1),
      url: acc,
    };
  }
  return rtn;
};
app.use((req, res, next) => {
  req.breadcrumbs = get_breadcrumbs(req.originalUrl);
  next();
});

// --- Auth0 Setup ---
const authConfig = {
  secret: process.env.SECRET,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
  baseURL: process.env.BASE_URL,
  authRequired: false,
  auth0Logout: true,
};
app.use(auth(authConfig));

// --- Middleware to protect routes ---
function requiresAuth(req, res, next) {
  if (!req.oidc.isAuthenticated()) {
    return res.redirect('/login'); // send to Auth0 login if not logged in
  }
  next();
}

// --- Auth0 Home Page ---
app.get('/', (req, res) => {
  if (req.oidc.isAuthenticated()) {
    res.send(`<h1>Welcome ${req.oidc.user.name}</h1><a href="/purchase">Purchase</a>`);
  } else {
    res.send('<h1>Welcome</h1><a href="/login">Login</a>');
  }
});

// --- Purchase Form Page ---
app.get('/purchase', requiresAuth, (req, res) => {
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

// --- Handle Purchase Submission ---
app.post('/purchase', requiresAuth, express.urlencoded({ extended: true }), async (req, res) => {
  const user = req.oidc.user;

  // Date validation: no past dates or Sundays
  const selectedDate = new Date(req.body.date);
  const today = new Date();
  today.setHours(0,0,0,0);
  if (selectedDate < today) return res.send('You cannot select a past date!');
  if (selectedDate.getDay() === 0) return res.send('You cannot select Sunday!');

  const order = new Order({
    username: user.nickname || user.name,
    email: user.email,
    date: req.body.date,
    time: req.body.time,
    location: req.body.location,
    product: req.body.product,
    quantity: req.body.quantity,
    message: req.body.message
  });

  await order.save();
  res.send(`<h1>Order Confirmed!</h1><a href="/myorders">View My Orders</a>`);
});

// --- My Orders Page ---
app.get('/myorders', requiresAuth, async (req, res) => {
  const user = req.oidc.user;
  const myOrders = await Order.find({ username: user.nickname || user.name });

  let html = '<h1>My Orders</h1>';
  if (myOrders.length === 0) html += '<p>No orders yet.</p>';
  else {
    myOrders.forEach(o => {
      html += `
        <div style="border:1px solid #000; margin:10px; padding:5px;">
          <p>Product: ${escape(o.product)}</p>
          <p>Date: ${escape(o.date)}</p>
          <p>Time: ${escape(o.time)}</p>
          <p>Location: ${escape(o.location)}</p>
          <p>Quantity: ${escape(o.quantity)}</p>
          <p>Message: ${escape(o.message)}</p>
        </div>
      `;
    });
  }
  html += '<a href="/purchase">Make Another Order</a>';
  res.send(html);
});

// --- Existing Routers ---
app.use('/', indexRouter);
app.use('/products', productsRouter);
app.use('/user', usersRouter);
app.use('/pages', pagesRouter);
app.use('/admin', adminRouter);

// Catch 404
app.use((req, res, next) => next(createError(404)));

// Error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Start server
const port = process.env.PORT || 3000;
app.set('port', port);
app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});

module.exports = app;
