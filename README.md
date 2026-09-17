# ALPHA Gold Store

A full-stack Persian RTL e-commerce application for gold and jewelry, built with Node.js, Express, MongoDB, Mongoose and EJS.

ALPHA is designed around the business requirements of selling crafted gold online: dynamic gold pricing, short-lived price quotes, inventory reservation, payment verification, customer authentication, shipping, account management, support and a role-protected administration panel.

> Current sales engine: **crafted gold**. The product schema is prepared for additional catalog types such as bullion, silver and coins, but those pricing engines are intentionally not enabled yet.

---

## Highlights

- Dynamic gold price calculation instead of storing a static final product price
- Quote-based checkout with expiring prices
- MongoDB transactions for sensitive checkout and inventory operations
- Inventory reservation during payment
- Automatic stock release when a payment expires
- ZarinPal payment integration with a safe mock gateway for development and tests
- Late-payment review workflow instead of silently confirming inconsistent orders
- Unified OTP authentication for customers and administrators
- JWT authentication using HTTP-only cookies and optional Bearer tokens
- Role-based administration panel
- Persian RTL storefront rendered with EJS
- Product, category, subcategory, price, order, payment, user and content management
- Customer addresses, wishlist, orders, invoices and support tickets
- Shipping methods with province restrictions and free-shipping thresholds
- CMS-style informational pages
- Audit and SMS logs
- Product image uploads and processing
- Automated integration and pricing tests

---

## Tech Stack

### Backend

- **Node.js 22+**
- **Express.js 5**
- **CommonJS**
- **MongoDB**
- **Mongoose**

### Frontend

- **EJS** server-side rendering
- **HTML5**
- **CSS3**
- **Vanilla JavaScript**
- Persian **RTL** interface
- Local **Vazirmatn** variable font

### Authentication & Security

- **JSON Web Tokens (JWT)**
- **bcrypt**
- **OTP authentication**
- **Helmet**
- **CORS allowlisting**
- **express-rate-limit**
- HTTP-only cookies
- Request-origin protections

### Validation & Utilities

- **Joi**
- **cookie-parser**
- **dotenv**
- **Morgan**

### Media

- **Multer**
- **Sharp**

### Payments & Messaging

- **ZarinPal**
- Development/test **mock payment gateway**
- **Kavenegar** OTP adapter
- Development/test **mock SMS provider**

### Development & Testing

- **Nodemon**
- Node.js native **test runner** (`node --test`)
- Isolated local MongoDB replica-set preview environment
- Git / GitHub

---

## Architecture

The application follows a modular MVC-style structure with a dedicated service layer for business logic.

```text
ALPHA---GOLD---STORE/
├── app.js
├── controller/
│   ├── product-controllers/
│   └── shopping-controllers/
├── database/
├── middleware/
├── models/
│   ├── product-models/
│   └── shopping-models/
├── public/
│   ├── css/
│   ├── fonts/
│   ├── images/
│   └── js/
├── routes/
│   ├── api/
│   └── view/
├── services/
│   ├── product-services/
│   └── shopping-services/
├── validation/
├── utils/
├── views/
│   ├── admin/
│   └── store/
├── tests/
├── scripts/
└── docs/
```

Typical application flow:

```text
Route
  ↓
Middleware / Validation
  ↓
Controller
  ↓
Service Layer
  ↓
Mongoose Model
  ↓
MongoDB
```

Business-sensitive logic such as pricing, order preparation and payment handling lives in service modules instead of being embedded directly in route handlers.

---

## Core Data Models

The project currently includes models for:

- User
- OTP
- Address
- Product
- Category
- SubCategory
- GoldPricing
- Cart
- Order
- Payment
- Wishlist
- Store Settings
- Shipping Method
- Content Page
- Support Ticket
- Audit Log
- SMS Log

---

## Product Catalog

The product model currently supports these catalog types:

```text
crafted_gold
bullion
silver
coin
```

Only `crafted_gold` is currently enabled for checkout.

A product can contain:

- Name
- Slug
- SKU
- Category
- Subcategory
- Gender
- Gold weight
- Karat
- Wage configuration
- Accessories price
- Custom pricing settings
- Product details
- Stock
- Cover image
- Gallery images
- Description
- Active status
- Featured status

Supported gold karats currently include:

```text
18
21
22
24
```

---

## Dynamic Gold Pricing

ALPHA calculates the sell price dynamically instead of storing one fixed product price.

For crafted gold, the current pricing logic is:

```text
Gold Value = Gold Weight × Gold Price Per Gram

Wage =
  Fixed amount
  OR
  Gold Value × Wage Percent

Profit = (Gold Value + Wage) × Profit Percent

Tax = (Wage + Profit) × Tax Percent

Final Price =
  Gold Value
  + Wage
  + Profit
  + Tax
  + Accessories Price
```

Each invoice component is rounded to a whole Toman so the displayed components always add up to the final total.

Internal store currency is currently:

```text
IRT — Iranian Toman
```

### Standard vs Custom Pricing

Products can use either:

```text
standard
custom
```

With standard pricing, the store-wide profit and tax configuration is used.

With custom pricing, a product can override:

- Profit percentage
- Tax percentage
- Whether wage is enabled

This allows products with different pricing policies to coexist in the same catalog.

---

## Price Freshness Protection

The store has a configurable maximum gold-rate age.

If the current gold rate is older than the configured `maxRateAgeMinutes`, the application refuses to prepare a new payable order.

This prevents a customer from completing checkout using an outdated gold price.

---

## Cart & Checkout Flow

The main purchase flow is designed around price snapshots and short-lived quotes.

```text
Cart
  ↓
Select Address
  ↓
Select Shipping Method
  ↓
Validate Product Availability
  ↓
Validate Gold Rate Freshness
  ↓
Calculate Current Prices
  ↓
Create Order Snapshot
  ↓
Generate quoteId
  ↓
2-minute Price Validity
  ↓
Start Payment
  ↓
Reserve Inventory
  ↓
10-minute Payment Window
  ↓
Verify Payment
  ↓
Confirm Order
```

### Two-Minute Order Quote

Prepared order prices are valid for approximately **2 minutes**.

A unique `quoteId` is generated for each prepared order. Starting payment requires the same quote ID and an unexpired price snapshot.

This is especially important for gold commerce because the underlying metal price can change quickly.

### Order Snapshots

Orders store snapshots instead of depending entirely on mutable product data.

Snapshots include data such as:

- Product name
- SKU
- Slug
- Cover image
- Quantity
- Gold weight
- Karat
- Gold price per gram
- Gold value
- Wage
- Profit
- Tax
- Accessories price
- Unit price
- Total price
- Shipping address
- Shipping method

This keeps historical order information stable even if products or prices change later.

---

## Inventory Reservation

Stock is not simply decremented after payment.

When payment starts, ALPHA reserves inventory using guarded database updates and MongoDB transactions.

Conceptually:

```text
Only reserve when:
stock >= requested quantity

Then:
stock -= requested quantity
```

If stock is insufficient, payment is not allowed to continue.

If payment expires or fails in a state where stock should be released, the reserved quantity is returned to inventory.

---

## MongoDB Transactions

Sensitive operations use MongoDB transactions, including checkout/order preparation and payment/inventory changes.

For this reason, the configured MongoDB server must support transactions and run as a **replica set**.

The application checks for replica-set support before starting in the configured environment.

---

## Payment System

Supported payment modes:

```text
mock
zarinpal
```

### Mock Gateway

The mock gateway exists only for development and testing.

The application explicitly refuses to run the mock payment gateway as a production payment provider.

### ZarinPal

The project contains integration support for:

- Payment request
- Authority handling
- Redirect URL
- Callback handling
- Payment verification
- Reference ID
- Gateway result codes
- Card PAN metadata
- Card hash metadata

Store amounts are internally kept in Toman. `PAYMENT_AMOUNT_MULTIPLIER` controls the amount conversion sent to the gateway.

---

## Payment Expiration

After payment starts, the customer has approximately **10 minutes** to finish the transaction.

A payment expiration worker periodically checks stale transactions.

When a stale payment is found, the system can:

- Mark the payment as expired
- Mark the order as expired
- Mark payment status as failed
- Release previously reserved stock

The worker runs automatically while the application is running.

---

## Late Payment Review

Payment systems can produce difficult edge cases, such as a bank-confirmed payment arriving after the store-side payment window has already expired.

ALPHA does not silently convert these cases into normal confirmed orders.

Instead, a verified payment can be moved into a review state:

```text
requiresReview = true
order.status = review
```

An administrator can then resolve the case by recording one of the supported outcomes:

```text
stock_supplied
refunded
```

This avoids pretending an inconsistent payment/order state is normal.

---

## Idempotent Payment Handling

Successful or refunded payments are treated as terminal states.

Repeated success calls do not repeatedly consume stock or create a second successful order transition.

This behavior is covered by automated tests.

---

## Customer Authentication

The application supports JWT authentication using:

- HTTP-only cookie
- Optional `Authorization: Bearer <token>` header

The authentication middleware verifies:

- JWT validity
- User existence
- Account status
- Token version

---

## Unified OTP Sign-In

Customers and administrators share the same sign-in flow:

```text
/login
```

The account role remains server-side.

A successfully authenticated administrator receives access to the administration panel while a normal customer remains in the customer account area.

Legacy `/admin/login` links redirect to the shared login page.

---

## OTP Security

The OTP flow includes several protections:

- Cryptographically generated six-digit codes
- UUID challenge values
- HMAC-SHA256 OTP digest
- Raw OTP codes are not stored in the database
- Constant-time digest comparison using `timingSafeEqual`
- Single-use OTP consumption
- OTP expiration
- Attempt limit
- Resend cooldown
- Hourly send limit
- Development codes only in explicit development/test mock mode

Default settings currently support approximately:

```text
OTP TTL:       120 seconds
Resend delay:   60 seconds
Max attempts:    5
Max sends/hour:  5
```

---

## SMS Integration

The OTP service is prepared for **Kavenegar**.

In production, real SMS delivery requires valid provider configuration.

Development and automated tests can use the mock provider without sending external SMS messages.

SMS logs store masked phone values instead of the complete customer number.

Older SMS log records are automatically expired through a MongoDB TTL index.

---

## Password Security

The legacy password authentication path remains available in the codebase.

Passwords are:

- Hashed using **bcrypt**
- Hashed with cost factor `12`
- Excluded from normal Mongoose query selection
- Removed from JSON output

Sign-up does not accept a role from the client.

---

## Token Revocation

Users contain a `tokenVersion` value.

JWTs include the user's token version, allowing existing sessions to become invalid when the stored version changes.

This provides a simple foundation for server-side session invalidation without storing every JWT.

---

## Account Status

Supported account states:

```text
active
deactivated
suspended
```

Deactivation metadata can include:

```text
user_deleted_account
admin_deactivated
security
other
```

The application blocks authentication for unavailable accounts.

---

## Role-Based Access Control

Current application roles:

```text
user
admin
```

Admin APIs and admin pages are protected server-side.

Normal customers cannot gain admin access by changing client-side state or route URLs.

---

## HTTP & Request Security

Security controls implemented in the application include:

### Helmet

Helmet is enabled and Content Security Policy directives are configured for scripts, images and fonts.

### CORS Allowlist

Cross-origin requests are allowed only for configured origins.

Credentials are supported for approved origins.

### Cookie Security

Authentication cookies use:

```text
httpOnly: true
sameSite: lax
secure: true   # production
```

### Authentication Rate Limiting

The current auth rate limiter uses approximately:

```text
10 requests / 15 minutes
```

### Cross-Site Request Protection

For state-changing cookie-authenticated requests, the application checks a custom request header and browser fetch-site metadata.

The current frontend sends:

```text
X-Requested-With: Alpha
```

Cross-site mutation requests can be rejected before reaching business logic.

### Body Size Limits

Request body size is limited for JSON and URL-encoded input.

### Server Fingerprinting

Express `X-Powered-By` is disabled.

### JWT Secret Guard

The application refuses to start with a missing or too-short JWT secret.

---

## Validation

Request validation is organized separately using **Joi**.

Validation modules exist for:

- Authentication
- Account
- User management
- Addresses
- Categories
- Subcategories
- Products
- Gold pricing
- Cart
- Order
- Payment
- Wishlist

---

## Product Image Uploads

Image uploads use **Multer** with in-memory storage.

Current protections include:

- Image MIME-type filtering
- Maximum upload size of approximately **5 MB**

Images are processed using **Sharp** before being stored in the public product image directory.

---

## Storefront

The public storefront is rendered server-side with EJS.

The UI is Persian and RTL:

```html
<html lang="fa" dir="rtl">
```

The storefront includes:

- Homepage
- Dynamic gold-rate display
- Hero/slider content
- Product discovery
- Search
- Category browsing
- Subcategory browsing
- Product details
- Related products
- Shopping cart
- Checkout
- Payment result
- Login
- Customer account
- Wishlist
- Content pages

The frontend uses locally served CSS and JavaScript without a frontend SPA framework.

---

## Customer Account

Authenticated customers have an account area with sections such as:

- Overview
- Orders
- Order details
- Invoice view
- Addresses
- Profile
- Wishlist
- Support

Private pages redirect unauthenticated users to the shared login page.

---

## Address Management

Customers can store multiple shipping addresses.

The address flow includes:

- User ownership checks
- Default-address behavior
- Province/city validation
- Safe concurrent first-address creation

---

## Shipping

Administrators can define multiple shipping methods.

A shipping method can include:

- Name
- Description
- Cost
- Province restrictions
- Free-shipping threshold
- Active state
- Sort order

Example:

```text
If subtotal >= freeAbove
shipping cost = 0
```

---

## Content Management

The application includes database-backed content pages.

Supported areas include:

- About
- Contact
- Buying guide
- FAQ
- Shipping
- Returns
- Privacy
- Terms

Draft content stays private until published.

---

## Customer Support

Customers can open support tickets.

Tickets support:

- User ownership
- Optional order association
- Subject
- Status
- Message thread
- Customer replies
- Admin replies

Ticket access is scoped so customers cannot access another user's support conversation.

---

## Admin Panel

The EJS-based administration panel is protected by authentication and admin-role checks.

Current admin areas include:

- Dashboard
- Products
- Product creation/editing
- Categories
- Subcategories
- Gold pricing
- Orders
- Order details
- Payments
- Users
- Carts
- Store settings
- SMS / authentication settings
- Shipping
- Content
- Support
- Audit logs

### Product Administration

Administrators can manage:

- Product information
- Category relationships
- SKU
- Gold weight
- Karat
- Wage
- Custom pricing
- Accessories price
- Stock
- Active status
- Featured status
- Product images

Dependency guards help prevent unsafe deletion of catalog entities that are still in use.

### Order Administration

Order status transitions are validated server-side.

Shipping fulfillment can include:

- Tracking code
- Carrier

### Store Settings

Store-wide settings include values such as:

- Hero title
- Hero subtitle
- Contact details
- Instagram
- Sales enabled flag
- Maximum gold-rate age
- OTP TTL
- OTP resend timing

### Emergency Sales Pause

The `salesEnabled` setting can disable new order preparation without shutting down the entire website.

---

## Audit Logging

The application contains an audit-log model designed to store administrative activity metadata:

- Actor
- Action
- Target
- Details

An admin audit section is available in the management interface.

---

## SEO & Accessibility Basics

The storefront includes:

- Dynamic page titles
- Meta descriptions
- `noindex,nofollow` for selected private/demo/payment pages
- Semantic navigation
- ARIA labels
- Mobile menu accessibility attributes
- Skip-to-content link
- Local font preloading

---

## Health Check

```http
GET /health
```

Expected behavior:

```text
200  MongoDB connected
503  MongoDB unavailable
```

---

## Error Handling

The project uses centralized asynchronous and operational error handling through utilities such as:

```text
AppError
catchAsync
globalErrorHandler
```

The process also handles severe Node.js errors such as:

- `uncaughtException`
- `unhandledRejection`

---

## Automated Tests

The project uses Node.js's built-in test runner rather than Jest or Mocha.

```bash
npm test
```

The test suite covers important flows including:

- Public and private page rendering
- Product catalog pricing
- Inactive product protection
- OTP single use
- OTP cooldown and attempt limits
- Production mock-provider guards
- Cookie request protections
- Address concurrency
- Address ownership
- Province/city validation
- Cart pricing
- Order price snapshots
- Shipping totals
- Mock payment flow
- Payment idempotency
- Inventory consumption
- Order ownership
- Fulfillment transitions
- Support ticket ownership
- Admin support replies
- Content draft privacy
- Admin/customer route authorization
- Admin catalog CRUD
- Dependency guards
- Media upload flows

A separate pricing test file verifies the pricing engine independently.

---

## Development Environment

### Recommended Local Preview

```bash
npm install
npm run dev
```

The local preview setup uses an isolated MongoDB replica set rather than the configured business database.

Current preview defaults:

```text
Replica set: alphaDev
MongoDB port: 27029
Database: alpha-preview
Website: http://127.0.0.1:3100
SMS: mock
Payment: mock
```

Without Nodemon:

```bash
npm run dev:local
```

Configured `.env` environment:

```bash
npm run dev:configured
```

---

## Available NPM Scripts

```bash
npm run dev
npm run dev:configured
npm run dev:local
npm run db:local
npm run seed:admin
npm run migrate:payments
npm test
npm run check
npm start
```

| Command | Purpose |
|---|---|
| `npm run dev` | Development preview with Nodemon and isolated local setup |
| `npm run dev:local` | Local preview without Nodemon |
| `npm run dev:configured` | Run using the configured `.env` environment |
| `npm run db:local` | Start the local development database setup |
| `npm run seed:admin` | Seed an administrator account |
| `npm run migrate:payments` | Run payment-flow migration logic |
| `npm test` | Run automated tests |
| `npm run check` | Run repository checks |
| `npm start` | Start the configured application |

---

## Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Important settings include:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=3000

MONGODB_URI=mongodb://127.0.0.1:27017/gold-store

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d

CLIENT_ORIGIN=http://127.0.0.1:3000,http://localhost:3000

PAYMENT_GATEWAY=mock
PAYMENT_AMOUNT_MULTIPLIER=10

ZARINPAL_MERCHANT_ID=
ZARINPAL_SANDBOX=true
PAYMENT_CALLBACK_URL=http://127.0.0.1:3000/api/payments/zarinpal/callback

SMS_PROVIDER=mock
KAVENEGAR_API_KEY=
KAVENEGAR_TEMPLATE=
```

> Never commit production secrets, merchant credentials or SMS API keys to the repository.

---

## Production Checklist

Before production use, verify at minimum:

1. Production MongoDB is configured as a replica set.
2. `JWT_SECRET` is long, random and private.
3. Production `CLIENT_ORIGIN` is correct.
4. Mock payment is disabled.
5. ZarinPal merchant configuration is valid.
6. Gateway amount units and `PAYMENT_AMOUNT_MULTIPLIER` are verified.
7. Real SMS provider credentials are configured.
8. HTTPS is enabled.
9. Gold-rate freshness settings match store operations.
10. Backup, monitoring and deployment policies are configured.

---

## Current Scope & Roadmap

### Implemented

- Crafted-gold catalog
- Dynamic gold pricing
- Persian storefront
- Customer accounts
- OTP authentication
- Admin authorization
- Wishlist
- Addresses
- Cart
- Shipping
- Order snapshots
- Quote expiration
- Inventory reservation
- Payment expiration
- Mock payments
- ZarinPal integration layer
- Late-payment review
- Support tickets
- Content management
- Audit/SMS logs
- Admin panel
- Automated tests

### Prepared but Not Yet Enabled for Sales

- Bullion
- Silver
- Coins

These catalog types exist in the data model but require dedicated and verified pricing/business engines before being enabled for checkout.

---

## Security Philosophy

This repository intentionally treats e-commerce state transitions as server-side business decisions rather than trusting the browser.

Examples:

- Final prices are recomputed by the backend.
- Order prices expire.
- Payment requires the current quote ID.
- Stock is checked and reserved server-side.
- Admin access is enforced server-side.
- Account ownership is checked server-side.
- OTPs are single-use and hashed.
- Payment callbacks are verified rather than trusted from the redirect alone.
- Inconsistent late payments are routed to review instead of automatically accepted.

---

## Author

**Behnam Mohamadi**

GitHub: [BehnamMohamadi](https://github.com/BehnamMohamadi)

---

## License

ISC
