class ApiFeatures {
  constructor(query, queryString, excludedFields = []) { this.query = query; this.queryString = queryString; this.excludedFields = excludedFields; this.filterObject = {}; }
  filter() {
    const allowed = ["status", "paymentStatus", "gateway", "reviewStatus", "requiresReview", "role", "isActive", "isFeatured", "category", "subCategory", "gender", "karat", "sku", "slug", "accountStatus.status"];
    for (const key of allowed) if (typeof this.queryString[key] === "string" && !Object.hasOwn(this.query.getFilter(), key)) this.filterObject[key] = this.queryString[key];
    this.query = this.query.find(this.filterObject); return this;
  }
  sort() { const value = typeof this.queryString.sort === "string" ? this.queryString.sort : "-createdAt"; this.query = this.query.sort(value.split(",").filter(x => /^-?[a-zA-Z][\w.]*$/.test(x)).join(" ")); return this; }
  limitFields() { this.query = this.query.select(["__v", "password", ...this.excludedFields].map(x => `-${x}`).join(" ")); return this; }
  paginate() { this.page = Math.min(100000, Math.max(1, Math.floor(Number(this.queryString.page) || 1))); this.limit = Math.min(100, Math.max(1, Math.floor(Number(this.queryString.limit) || 10))); this.query = this.query.skip((this.page - 1) * this.limit).limit(this.limit); return this; }
}
module.exports = { ApiFeatures };
