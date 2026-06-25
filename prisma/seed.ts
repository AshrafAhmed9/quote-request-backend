import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.quoteRequest.deleteMany();

  const quotes = [
    {
      customer: "Acme Construction",
      project: "Highway Bridge Expansion",
      status: "New",
      estimatedValue: 1500000,
    },
    {
      customer: "Global Engineering Ltd",
      project: "Office Tower Foundation",
      status: "In Review",
      estimatedValue: 3200000,
    },
    {
      customer: "Metro Transit Authority",
      project: "Underground Tunnel Reinforcement",
      status: "Needs Info",
      estimatedValue: 8750000,
    },
    {
      customer: "Sunrise Developers",
      project: "Residential Complex Phase 2",
      status: "Completed",
      estimatedValue: 4100000,
    },
    {
      customer: "Pacific Ports Inc",
      project: "Container Terminal Upgrade",
      status: "New",
      estimatedValue: 6200000,
    },
  ];

  for (const q of quotes) {
    await prisma.quoteRequest.create({ data: q });
  }

  console.log(`Seeded ${quotes.length} quotes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
