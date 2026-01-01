const moduleAlias = require("module-alias");
const path = require("path");

// Resolve the project root and the output directory (dist)
const root = path.resolve(__dirname, "../../");
const dist = path.join(root, "dist");

/**
 * Configure runtime path aliases for Node.js.
 * This maps the same aliases defined in tsconfig.json to the compiled JavaScript files in /dist.
 */
moduleAlias.addAliases({
  "@": dist,
  "@utils": path.join(dist, "utils"),
  "@handlers": path.join(dist, "handlers"),
  "@events": path.join(dist, "events"),
  "@models": path.join(dist, "models"),
  "@services": path.join(dist, "services"),
  "@types": path.join(dist, "types"),
  "@config": path.join(dist, "config"),
});

// Export the registration function if needed, though module-alias/register usually handles this
module.exports = () => {
  console.log("[INFO] Path aliases registered successfully.");
};
