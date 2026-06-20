import { db, schema } from "./index";
import { hashPassword } from "../lib/password";

async function seed() {
  console.log("Seeding database...");

  const passwordHash = await hashPassword("admin123");

  const [admin] = await db.insert(schema.users).values({
    email: "admin@evansvite.local",
    passwordHash,
    displayName: "Admin",
    isAdmin: true,
    actorId: `${process.env.INSTANCE_URL || "http://localhost:3000"}/users/admin`,
  }).onConflictDoNothing({ target: schema.users.email }).returning();

  if (admin) {
    console.log(`Created admin user: ${admin.email}`);
  }

  const [user] = await db.insert(schema.users).values({
    email: "user@evansvite.local",
    passwordHash,
    displayName: "Demo User",
    actorId: `${process.env.INSTANCE_URL || "http://localhost:3000"}/users/demo`,
  }).onConflictDoNothing({ target: schema.users.email }).returning();

  if (user) {
    console.log(`Created demo user: ${user.email}`);
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const adminId = admin?.id || 1;
  const userId = user?.id || 2;

  const sampleEvents = [
    {
      title: "Community Meetup",
      description: "Monthly community gathering to discuss projects and ideas. All welcome!",
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
      location: "Downtown Community Center",
      organizerId: adminId,
      capacity: 50,
    },
    {
      title: "Tech Talk: Federated Web",
      description: "A discussion about the fediverse, ActivityPub, and decentralized social platforms.",
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 1.5 * 60 * 60 * 1000),
      location: "Virtual (Zoom)",
      organizerId: adminId,
      capacity: 100,
    },
    {
      title: "Weekend Hackathon",
      description: "Bring your projects and ideas! Collaborate with fellow developers.",
      startTime: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000),
      location: "Innovation Hub",
      organizerId: userId,
      capacity: 30,
    },
  ];

  for (const ev of sampleEvents) {
    await db.insert(schema.events).values(ev).onConflictDoNothing({ target: schema.events.id });
  }

  console.log(`Seeded ${sampleEvents.length} sample events`);
  console.log("Seed complete.");
}

seed().catch(console.error);
