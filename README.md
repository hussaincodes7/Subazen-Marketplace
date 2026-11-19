# Subazen Marketplace

Subazen is a full-stack online marketplace with a customer storefront, an admin dashboard, and a REST API. It uses React, Express, Node.js, and MongoDB.

## Repository structure

```text
subazen-marketplace/
├── admin-app/       # Admin dashboard
├── mern-back-end/   # Express API and MongoDB integration
└── subazen/         # Customer storefront
```

## Features

- Browse products and nested categories
- Search, sort, and filter products by price and availability
- Manage products, categories, brands, orders, banners, and homepage sections in the admin dashboard
- Upload and serve product and storefront images through the API
- Customer accounts, cart, checkout, and order management
- XML sitemap and `robots.txt` for search engines

## Technology

- React and React Router
- Redux
- Node.js and Express
- MongoDB and Mongoose
- JWT authentication
- Multer for image uploads

## Requirements

- Node.js and npm
- A MongoDB database
- A Resend API key if order emails are required

## Local development

### 1. Configure and start the API

From `mern-back-end`, create a `.env` file with your own values:

```env
PORT=2000
HOST=127.0.0.1
NODE_ENV=development
API=http://localhost:2000
PUBLIC_URL=http://localhost:2000
CLIENT_ORIGIN=http://localhost:3000,http://localhost:3001
STOREFRONT_URL=http://localhost:3000

MONGO_DB_USER=your_mongodb_username
MONGO_DB_PASSWORD=your_mongodb_password
MONGO_DB_HOST=your_cluster.mongodb.net
MONGO_DB_DATABASE=your_database_name

JWT_SECRET=replace_with_a_long_random_secret
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="Subazen <orders@example.com>"
```

Install dependencies and run the API:

```bash
cd mern-back-end
npm install
npm run dev
```

The API runs on `http://localhost:2000`.

### 2. Start the storefront

In a separate terminal:

```bash
cd subazen
npm install
npm start
```

The storefront runs on `http://localhost:3000`.

### 3. Start the admin dashboard

In another terminal:

```bash
cd admin-app
npm install
npm start
```

If the storefront is already using port 3000, set the admin app to use port 3001. In PowerShell:

```powershell
$env:PORT = "3001"
npm start
```

Add the admin app’s local origin to `CLIENT_ORIGIN` in the backend `.env` if needed.

## Production builds

Build each React app from its own folder:

```bash
cd subazen
npm run build
```

```bash
cd admin-app
npm run build
```

The storefront and admin production API settings are in their `.env.production` files. Update those URLs if deploying to different domains:

```env
REACT_APP_API_URL=https://api.example.com/api
REACT_APP_PUBLIC_URL=https://api.example.com
```

## Environment and security

- Keep `.env` files, database credentials, JWT secrets, API keys, SSH keys, and private keys out of GitHub.
- Use strong, unique secrets in production.
- Configure MongoDB network access for the API server.
- Restrict production CORS origins to the storefront and admin domains.
- Store uploads on persistent server storage and back them up.

## Sitemap

The production storefront serves its sitemap at:

```text
https://www.subazen.com/sitemap.xml
```

The backend also generates a sitemap from the current catalog. The checked-in storefront sitemap is a snapshot and should be refreshed when the catalog changes.
