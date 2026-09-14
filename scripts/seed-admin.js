//npm run seed:admin create admin account in user collection

const { join } = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: join(__dirname, "../.env") });

const { connectToDatabase } = require("../database/database-connection");
const User = require("../models/user-model");

const seedAdmin = async () => {
  await connectToDatabase();

  const {
    ADMIN_FIRSTNAME,
    ADMIN_LASTNAME,
    ADMIN_PHONENUMBER,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
  } = process.env;

  if (!ADMIN_FIRSTNAME || !ADMIN_LASTNAME || !ADMIN_PHONENUMBER || !ADMIN_PASSWORD) {
    throw new Error("admin env values are required");
  }

  let admin = await User.findOne({
    phonenumber: ADMIN_PHONENUMBER,
  });

  if (admin) {
    admin.firstname = ADMIN_FIRSTNAME;
    admin.lastname = ADMIN_LASTNAME;
    admin.email = ADMIN_EMAIL || admin.email;
    admin.role = "admin";
    admin.password = ADMIN_PASSWORD;
    admin.accountStatus = {
      status: "active",
      reason: null,
      at: null,
      by: null,
    };

    await admin.save();
    console.log("[+] admin updated.");
  } else {
    await User.create({
      firstname: ADMIN_FIRSTNAME,
      lastname: ADMIN_LASTNAME,
      phonenumber: ADMIN_PHONENUMBER,
      email: ADMIN_EMAIL || undefined,
      password: ADMIN_PASSWORD,
      role: "admin",
    });

    console.log("[+] admin created.");
  }

  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error("[-] seed admin >", err);
  process.exit(1);
});
