Introduction

A virtual ecommerce website using Node.js, Express.js, Mongoose, and Auth0 authentication.
This project was developed as part of the Secure Software Application Development assignment.

It demonstrates secure authentication, purchase form validation, and order storage in MongoDB following OWASP guidelines.

Demo

The application can be run locally, and supports login/logout via Auth0.
Users can log in, place orders using a purchase form, and view their orders securely.

Run
1. Install dependencies
npm install

2. Configure .env

At the root of your project, create a file named .env and add:

CLIENT_ID=your-client-id
ISSUER_BASE_URL=https://your-domain.us.auth0.com
SECRET=anyrandomlongstring
BASE_URL=http://localhost:3000
MONGO_URI=your-mongodb-connection-string


CLIENT_ID, ISSUER_BASE_URL → from Auth0 application

SECRET → any long random string (used by express-openid-connect)

BASE_URL → normally http://localhost:3000 for local testing

MONGO_URI → your MongoDB Atlas/local connection string

⚠️ Do not commit .env to GitHub. Add it to .gitignore.

3. Start the server
npm start


The app runs at:
👉 http://localhost:3000

Database Setup

If you are using MongoDB locally, create a database named bestbags and an orders collection.

Sample script to run in Mongo shell:

use bestbags;

db.createCollection("orders");

db.orders.insertOne({
  username: "testuser",
  email: "test@example.com",
  date: "2025-09-07",
  time: "10 AM",
  location: "Colombo",
  product: "Laptop",
  quantity: 1,
  message: "Sample order"
});

Security Features (OWASP)

Authentication: Secure login/logout with Auth0

Authorization: Routes (/purchase, /myorders) protected with middleware

Input validation: All form inputs checked

Date validation:

No past dates allowed

No Sundays allowed

XSS prevention: Outputs escaped properly

CSRF protection: Enabled with CSRF tokens

Sensitive data: Stored in .env

Technology

The application is built with:

Node.js

Express.js

MongoDB / Mongoose

Auth0 (express-openid-connect)

Bootstrap

FontAwesome

Features

The application displays a virtual bags store and allows:

Secure login/logout with Auth0

Access to purchase form only when logged in

Date validation (no past dates, no Sundays)

Place an order with product, quantity, delivery time & location

View only your own orders on /myorders

Orders stored securely in MongoDB

Database Models
Order Schema
{
  username: String,
  email: String,
  date: Date,
  time: String,
  location: String,
  product: String,
  quantity: Number,
  message: String
}

Colors

Below is the color palette used in this application:

#478ba2

#b9d4db

#e9765b

#f2a490

#de5b6d

#18a558

#f9f7f4

#202020

#474747