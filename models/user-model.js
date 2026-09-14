const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new Schema(
  {
    profileCompleted: { type: Boolean, default: true },
    phoneVerifiedAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    firstname: {
      type: String,
      minlength: [2, "firstname must be at least 3 characters"],
      maxlength: [30, "firstname must be maximum 30 characters"],
      required: [true, "firstname is required"],
      trim: true,
    },
    lastname: {
      type: String,
      minlength: [2, "lastname must be at least 3 characters"],
      maxlength: [30, "lastname must be maximum 30 characters"],
      required: [true, "lastname is required"],
      trim: true,
    },
    phonenumber: {
      type: String,
      required: [true, "phonenumber is required"],
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minlength: [8, "password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "role is either user or admin",
      },
      default: "user",
      index: true,
    },
    accountStatus: {
      status: {
        type: String,
        enum: {
          values: ["active", "deactivated", "suspended"],
          message: "account status must be active, deactivated or suspended",
        },
        default: "active",
        index: true,
      },
      reason: {
        type: String,
        enum: {
          values: ["user_deleted_account", "admin_deactivated", "security", "other"],
          message: "invalid account status reason",
        },
        default: null,
      },
      at: {
        type: Date,
        default: null,
      },
      by: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { timestamps: true, toJSON: { transform(doc, ret) { delete ret.password; delete ret.__v; return ret; } } },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = model("User", userSchema);
