const env = require('dotenv');
env.config();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const commonMiddleware = require('./common-middleware');
const userRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin/auth');
const categoryRoutes = require('./routes/category');
const brandRoutes = require('./routes/brand');
const priceCollectionRoutes = require('./routes/priceCollection');
const productRoutes = require('./routes/product');
const cartRoutes = require('./routes/cart');
const addressRoutes = require('./routes/address');
const orderRoutes = require('./routes/order');
const path = require ('path');
const initialDataRoutes = require('./routes/admin/initialData');
const pageRoutes = require('./routes/admin/page');
const adminOrderRoutes = require('./routes/admin/order.routes');
const shippingRoutes = require('./routes/admin/shipping.routes');
const sitemapController = require('./controller/admin/sitemap');
const homepageAdminRoutes = require('./routes/admin/homepage');
const homepageRoutes = require('./routes/homepage');
const footerAdminRoutes = require('./routes/admin/footer');
const reviewAdminRoutes = require('./routes/admin/review');
const footerRoutes = require('./routes/footer');
const contactRoutes = require('./routes/contact');
const trackingAdminRoutes = require('./routes/admin/tracking');
const trackingRoutes = require('./routes/tracking');
const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

// Keep each process' Mongo pool bounded and configurable. Set these per instance
// based on Atlas limits and the number of app workers in the deployment.
const mongoPoolSize = positiveInt(process.env.MONGO_MAX_POOL_SIZE, 100);
mongoose.connect(`mongodb+srv://${encodeURIComponent(process.env.MONGO_DB_USER)}:${encodeURIComponent(process.env.MONGO_DB_PASSWORD)}@${process.env.MONGO_DB_HOST}/${encodeURIComponent(process.env.MONGO_DB_DATABASE)}?authSource=admin&retryWrites=true&w=majority`, {
  maxPoolSize: mongoPoolSize,
  minPoolSize: Math.min(positiveInt(process.env.MONGO_MIN_POOL_SIZE, 5), mongoPoolSize),
  maxIdleTimeMS: positiveInt(process.env.MONGO_MAX_IDLE_TIME_MS, 60000),
  waitQueueTimeoutMS: positiveInt(process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS, 10000),
  serverSelectionTimeoutMS: positiveInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10000),
  connectTimeoutMS: positiveInt(process.env.MONGO_CONNECT_TIMEOUT_MS, 10000),
})
  .then(async () => {
    await mongoose.connection.db.admin().ping();
    console.log('Database connected');
    const listenHost = process.env.HOST || '127.0.0.1';
    app.listen(process.env.PORT, listenHost, () => {
      console.log(`Server is running on ${listenHost}:${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });


app.use(express.json());

const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  [
    'http://localhost:3000',
    'http://localhost:4000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
  ].forEach((origin) => {
    if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
  });
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

app.use(commonMiddleware);

const robotsHandler = (_req, res) => {
  const base = "https://subazen.com";
  res.type("text/plain").send(["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /search", "Disallow: /cart", "Disallow: /checkout", "Disallow: /account", `Sitemap: ${base}/sitemap.xml`].join("\n"));
};
app.get("/sitemap.xml", sitemapController.sitemap);
app.get("/robots.txt", robotsHandler);
app.get("/api/sitemap.xml", sitemapController.sitemap);
app.get("/api/robots.txt", robotsHandler);app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Subazon API is running',
    endpoints: {
      auth: '/api',
      adminAuth: '/api/admin',
    },
  });
});
app.use('/api', userRoutes);
app.use('/public', express.static(path.resolve(__dirname, 'uploads')));
app.use('/public', express.static(path.resolve(__dirname, '..', 'uploads')));
app.use('/api/locations', express.static(path.resolve(__dirname, 'data'), { maxAge: '1d' }));
app.use('/api/admin', adminRoutes);
app.use('/api/admin', pageRoutes);
app.use('/api/admin', adminOrderRoutes);
app.use('/api/admin', shippingRoutes);
app.use('/api/admin', homepageAdminRoutes);
app.use('/api/admin', footerAdminRoutes);
app.use('/api/admin', reviewAdminRoutes);
app.use('/api/admin', trackingAdminRoutes);
app.use('/api', categoryRoutes);
app.use('/api', brandRoutes);
app.use('/api', priceCollectionRoutes);
app.use('/api', productRoutes);
app.use('/api', cartRoutes);
app.use('/api', addressRoutes);
app.use('/api', orderRoutes);
app.use('/api', initialDataRoutes);
app.use('/api', homepageRoutes);
app.use('/api', footerRoutes);
app.use('/api', contactRoutes);
app.use('/api', trackingRoutes);



