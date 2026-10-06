import { db } from "../src/lib/db";
import * as crypto from "crypto";

async function main() {
  console.log("Resetting database...");

  // 1. Clean up existing data — the dashboard starts empty (no stores).
  await db.update.deleteMany({});
  await db.storeStatus.deleteMany({});
  await db.session.deleteMany({});
  await db.pushUpdate.deleteMany({});
  await db.user.deleteMany({});
  await db.store.deleteMany({});
  console.log("✓ Cleared existing data");

  // 2. Seed the System Admin (sa) user — wolf / wolf310809
  const saPasswordHash = crypto
    .createHash("sha256")
    .update("wolf310809")
    .digest("hex");

  const sa = await db.user.create({
    data: {
      username: "wolf",
      password: saPasswordHash,
      role: "sa",
      fullName: "Wolf (System Admin)",
    },
  });
  console.log("✓ System Admin user ready:", sa.username, sa.role);

  // 3. Seed a welcome push update (no stores seeded — dashboard starts empty)
  await db.pushUpdate.create({
    data: {
      title: "Welcome to Store Update Monitor",
      subject:
        "Upload your store list to begin tracking CFC Refresh and AOO Manual Import progress.",
      content:
        "This is the Store Update Monitor dashboard. " +
        "Use the Upload Excel button in the top right to import your store list ( Manitoba, Edmonton, Calgary ). " +
        "Each store will be grouped by area into the three fixed columns. " +
        "Push CFC Refresh and AOO Manual Import per-store; Menu Pull and Deliverect MenuPull are bulk operations on the toolbar. " +
        "Please contact Mr. Raymond M. Reintegrado (raymond.reintegrado@hiflyer.ca) for any questions or suggestions.",
      createdById: sa.id,
      active: true,
    },
  });
  console.log("✓ Welcome push update seeded");

  console.log("\nSeed complete.");
  console.log("System Admin login → UserID: wolf | Password: wolf310809");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
