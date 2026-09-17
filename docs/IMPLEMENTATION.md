# Alpha implementation

Scope: Persian RTL storefront, OTP customer authentication, product discovery and transparent gold pricing, cart/checkout/payment, customer account/addresses/orders/invoice/wishlist/support, shipping/content/SMS administration, existing admin compatibility, automated verification and local preview.

Preserve existing data. Local preview and tests use isolated MongoDB replica set `alphaDev` on port 27029, never the configured business database. No deployment or live SMS/payment has been performed.

Business conventions retained: Toman internally; fixed wage is per item; profit on gold plus wage; tax on wage plus profit; accessories added separately. Tax percentages remain merchant configuration, not hardcoded legal advice. Quotes last 2 minutes and initiated payments 10 minutes. Future categories do not enable unsupported pricing engines.

User has no SMS provider yet. Development OTP delivery is explicit and disabled in production. Kavenegar adapter is configurable without storing credentials in public settings.

Unified sign-in: customers and administrators use `/login` and the same OTP endpoints. Existing admin roles are retained server-side; sign-up never accepts a role. The account navigation shows the admin panel entry only for administrators. `/admin/login` redirects to `/login`, unauthenticated admin pages redirect there, and ordinary customers return to their account. Admin APIs still enforce role authorization. Local demo codes are visible only in explicit development/test mock mode.

The storefront section structure follows the PAWEAR reference: utility account links, search/navigation header, brand hero, four service links, image categories, paired promotional panels, new products and buying guidance. ALPHA gold/black imagery is preserved. Account sections remain accessible with the profile sidebar and administrator entry.

Validation: 18 tests pass, including common OTP admin login, role retention, account-link visibility and admin API access checks.

## Development commands

- `npm run dev`: local preview with automatic backend reload, MongoDB replica set `alphaDev` on port 27029, database `alpha-preview`, website http://127.0.0.1:3100. SMS and payments are explicitly mocked.
- `npm run dev:local`: same preview without nodemon.
- `npm run dev:configured`: use the database/settings in `.env`; MongoDB must be configured as a replica set.
- `npm start`: run against the configured environment.

Nodemon ignores MongoDB files, generated artifacts and uploads to avoid restart loops. Frontend styles/templates are served from disk. Run only one preview server on port 3100; set `ALPHA_PORT` to use another port.
