const { join } = require("node:path");

const express = require("express");

const morgan = require("morgan");

const dotenv = require("dotenv");

const cookieParser = require("cookie-parser");

const cors = require("cors");

const helmet = require("helmet");

const dotenvConfig = dotenv.config({
  path: join(__dirname, ".env"),
  quiet: true,
});

if (dotenvConfig.error && require.main === module && !process.env.MONGODB_URI) {
  console.error("[-] dotenv config", dotenvConfig.error.message);

  process.exit(1);
}

const { connectToDatabase } = require("./database/database-connection");

const { AppError } = require("./utils/app-error");

const { globalErrorHandler } = require("./controller/error-handler-controller");

const appRouter = require("./routes/app-route");

const {
  startPaymentExpirationWorker,
} = require("./services/shopping-services/payment-service");

process.on("uncaughtException", (err) => {
  console.error(err.name, err.message);

  process.exit(1);
});

const app = express();

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:"],
        "font-src": ["'self'"],
        "upgrade-insecure-requests": process.env.NODE_ENV === "production" ? [] : null,
      },
    },
  }),
);

if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.set("view engine", "ejs");

app.set("views", join(__dirname, "views"));

app.use(express.static(join(__dirname, "public")));

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const envOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const developmentOrigins = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  `http://127.0.0.1:${process.env.PORT || 3000}`,
  `http://localhost:${process.env.PORT || 3000}`,
];

const allowedOrigins = [
  ...new Set([
    ...envOrigins,

    ...(process.env.NODE_ENV !== "production" ? developmentOrigins : []),
  ]),
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] blocked origin: ${origin}`);

      return callback(new AppError(403, `origin ${origin} is not allowed by CORS`));
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

/*
|--------------------------------------------------------------------------
| Request parsers
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "40kb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,

    limit: "10kb",
  }),
);

app.use(cookieParser());
app.use(require("./middleware/request-security").requestSecurity);
app.get("/health", (req, res) =>
  res.status(require("mongoose").connection.readyState === 1 ? 200 : 503).json({
    status: require("mongoose").connection.readyState === 1 ? "ok" : "unavailable",
  }),
);

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/", appRouter);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  next(new AppError(404, `can't find ${req.method} ${req.originalUrl}`));
});

/*
|--------------------------------------------------------------------------
| Global error handler
|--------------------------------------------------------------------------
*/

app.use(globalErrorHandler);

/*
|--------------------------------------------------------------------------
| Server
|--------------------------------------------------------------------------
*/

const port = Number(process.env.PORT || 3000);

const host = process.env.HOST || "127.0.0.1";

let server;

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  await connectToDatabase();
  const hello = await require("mongoose").connection.db.admin().command({ hello: 1 });
  if (!hello.setName)
    throw new Error(
      "Alpha requires a MongoDB replica set for atomic address and checkout operations. Run npm run dev:local for an isolated preview.",
    );
  startPaymentExpirationWorker();
  server = app.listen(port, host, () =>
    console.info("Alpha: http://" + host + ":" + port),
  );
  return server;
}
if (require.main === module)
  startServer().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });

process.on("unhandledRejection", (err) => {
  console.error(err.name, err.message);

  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

module.exports = app;
module.exports.startServer = startServer;
