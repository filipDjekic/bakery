import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "./db.ts";

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  if (value.length > maxLength) {
    throw new Error(`Value "${value}" exceeds varchar(${maxLength})`);
  }

  return value as Varchar<N>;
}

async function main() {
  console.log("Seeding database...");

  // ---------------------------------------------------------------------------
  // Bakery settings
  // ---------------------------------------------------------------------------

  await db.orm.public.BakerySettings.upsert({
    create: {
      id: "default",
      bakeryName: varchar("Pekara Development", 120),
      phone: varchar("+381600000000", 30),
      address: varchar("Development adresa 1", 250),
      timezone: varchar("Europe/Belgrade", 100),
      currencyCode: varchar("RSD", 3),
      orderAcceptingEnabled: true,
      minimumPreparationMinutes: 30,
      maximumAdvanceDays: 7,
      pickupSlotMinutes: 15,
      notificationEmail: null,
    },
    update: {
      bakeryName: varchar("Pekara Development", 120),
      phone: varchar("+381600000000", 30),
      address: varchar("Development adresa 1", 250),
      timezone: varchar("Europe/Belgrade", 100),
      currencyCode: varchar("RSD", 3),
      orderAcceptingEnabled: true,
      minimumPreparationMinutes: 30,
      maximumAdvanceDays: 7,
      pickupSlotMinutes: 15,
      notificationEmail: null,
    },
    conflictOn: {
      id: "default",
    },
  });

  // ---------------------------------------------------------------------------
  // Business hours
  //
  // weekday:
  // 1 = Monday
  // ...
  // 7 = Sunday
  // ---------------------------------------------------------------------------

  await db.orm.public.BusinessHours
    .where({
      bakerySettingsId: "default",
    })
    .deleteAll();

  await db.orm.public.BusinessHours.createAll([
    {
      bakerySettingsId: "default",
      weekday: 1,
      openMinute: 360, // 06:00
      closeMinute: 1200, // 20:00
    },
    {
      bakerySettingsId: "default",
      weekday: 2,
      openMinute: 360,
      closeMinute: 1200,
    },
    {
      bakerySettingsId: "default",
      weekday: 3,
      openMinute: 360,
      closeMinute: 1200,
    },
    {
      bakerySettingsId: "default",
      weekday: 4,
      openMinute: 360,
      closeMinute: 1200,
    },
    {
      bakerySettingsId: "default",
      weekday: 5,
      openMinute: 360,
      closeMinute: 1200,
    },
    {
      bakerySettingsId: "default",
      weekday: 6,
      openMinute: 360, // 06:00
      closeMinute: 960, // 16:00
    },
    {
      bakerySettingsId: "default",
      weekday: 7,
      openMinute: 420, // 07:00
      closeMinute: 840, // 14:00
    },
  ]);

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  const burek = await db.orm.public.Category.upsert({
    create: {
      name: varchar("Burek", 80),
      slug: varchar("burek", 100),
      description: varchar("Sveže pečeni bureci.", 300),
      sortOrder: 1,
      isActive: true,
    },
    update: {
      name: varchar("Burek", 80),
      description: varchar("Sveže pečeni bureci.", 300),
      sortOrder: 1,
      isActive: true,
    },
    conflictOn: {
      slug: varchar("burek", 100),
    },
  });

  const peciva = await db.orm.public.Category.upsert({
    create: {
      name: varchar("Peciva", 80),
      slug: varchar("peciva", 100),
      description: varchar("Slana i slatka peciva.", 300),
      sortOrder: 2,
      isActive: true,
    },
    update: {
      name: varchar("Peciva", 80),
      description: varchar("Slana i slatka peciva.", 300),
      sortOrder: 2,
      isActive: true,
    },
    conflictOn: {
      slug: varchar("peciva", 100),
    },
  });

  const hleb = await db.orm.public.Category.upsert({
    create: {
      name: varchar("Hleb", 80),
      slug: varchar("hleb", 100),
      description: varchar("Sveži hleb iz dnevne proizvodnje.", 300),
      sortOrder: 3,
      isActive: true,
    },
    update: {
      name: varchar("Hleb", 80),
      description: varchar("Sveži hleb iz dnevne proizvodnje.", 300),
      sortOrder: 3,
      isActive: true,
    },
    conflictOn: {
      slug: varchar("hleb", 100),
    },
  });

  const slatko = await db.orm.public.Category.upsert({
    create: {
      name: varchar("Slatko", 80),
      slug: varchar("slatko", 100),
      description: varchar("Slatka peciva i poslastice.", 300),
      sortOrder: 4,
      isActive: true,
    },
    update: {
      name: varchar("Slatko", 80),
      description: varchar("Slatka peciva i poslastice.", 300),
      sortOrder: 4,
      isActive: true,
    },
    conflictOn: {
      slug: varchar("slatko", 100),
    },
  });

  // ---------------------------------------------------------------------------
  // Products
  //
  // Cena je u minor units:
  // 180 RSD = 18000
  // ---------------------------------------------------------------------------

  const products = [
    {
      categoryId: burek.id,
      name: varchar("Burek sa sirom", 120),
      slug: varchar("burek-sa-sirom", 140),
      description: varchar("Tradicionalni burek punjen sirom.", 1000),
      priceMinor: 18000,
      isActive: true,
      isAvailable: true,
      sortOrder: 1,
    },
    {
      categoryId: burek.id,
      name: varchar("Burek sa mesom", 120),
      slug: varchar("burek-sa-mesom", 140),
      description: varchar("Tradicionalni burek punjen mesom.", 1000),
      priceMinor: 20000,
      isActive: true,
      isAvailable: true,
      sortOrder: 2,
    },
    {
      categoryId: burek.id,
      name: varchar("Burek sa pečurkama", 120),
      slug: varchar("burek-sa-pecurkama", 140),
      description: varchar("Burek punjen pečurkama.", 1000),
      priceMinor: 19000,
      isActive: true,
      isAvailable: false,
      sortOrder: 3,
    },

    {
      categoryId: peciva.id,
      name: varchar("Kifla", 120),
      slug: varchar("kifla", 140),
      description: varchar("Klasična sveža kifla.", 1000),
      priceMinor: 6000,
      isActive: true,
      isAvailable: true,
      sortOrder: 1,
    },
    {
      categoryId: peciva.id,
      name: varchar("Pogačica sa sirom", 120),
      slug: varchar("pogacica-sa-sirom", 140),
      description: varchar("Mekana pogačica sa sirom.", 1000),
      priceMinor: 9000,
      isActive: true,
      isAvailable: true,
      sortOrder: 2,
    },
    {
      categoryId: peciva.id,
      name: varchar("Kroasan sa sirom", 120),
      slug: varchar("kroasan-sa-sirom", 140),
      description: varchar("Lisnati kroasan sa sirom.", 1000),
      priceMinor: 12000,
      isActive: true,
      isAvailable: false,
      sortOrder: 3,
    },

    {
      categoryId: hleb.id,
      name: varchar("Beli hleb", 120),
      slug: varchar("beli-hleb", 140),
      description: varchar("Klasični beli hleb.", 1000),
      priceMinor: 8000,
      isActive: true,
      isAvailable: true,
      sortOrder: 1,
    },
    {
      categoryId: hleb.id,
      name: varchar("Integralni hleb", 120),
      slug: varchar("integralni-hleb", 140),
      description: varchar("Hleb od integralnog brašna.", 1000),
      priceMinor: 11000,
      isActive: true,
      isAvailable: true,
      sortOrder: 2,
    },
    {
      categoryId: hleb.id,
      name: varchar("Ražani hleb", 120),
      slug: varchar("razani-hleb", 140),
      description: varchar("Hleb sa ražanim brašnom.", 1000),
      priceMinor: 12000,
      isActive: true,
      isAvailable: true,
      sortOrder: 3,
    },

    {
      categoryId: slatko.id,
      name: varchar("Čokoladna krofna", 120),
      slug: varchar("cokoladna-krofna", 140),
      description: varchar("Krofna sa čokoladnim punjenjem.", 1000),
      priceMinor: 12000,
      isActive: true,
      isAvailable: true,
      sortOrder: 1,
    },
    {
      categoryId: slatko.id,
      name: varchar("Kroasan sa čokoladom", 120),
      slug: varchar("kroasan-sa-cokoladom", 140),
      description: varchar(
        "Lisnati kroasan sa čokoladnim punjenjem.",
        1000,
      ),
      priceMinor: 14000,
      isActive: true,
      isAvailable: true,
      sortOrder: 2,
    },
    {
      categoryId: slatko.id,
      name: varchar("Rolnica sa cimetom", 120),
      slug: varchar("rolnica-sa-cimetom", 140),
      description: varchar("Mekana rolnica sa cimetom.", 1000),
      priceMinor: 13000,
      isActive: true,
      isAvailable: false,
      sortOrder: 3,
    },
  ];

  // ---------------------------------------------------------------------------
  // Product upserts
  // ---------------------------------------------------------------------------

  for (const product of products) {
    await db.orm.public.Product.upsert({
      create: product,
      update: {
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        priceMinor: product.priceMinor,
        isActive: product.isActive,
        isAvailable: product.isAvailable,
        sortOrder: product.sortOrder,
      },
      conflictOn: {
        slug: product.slug,
      },
    });
  }

  console.log("Database seeded successfully.");
}

try {
  await main();
} catch (error) {
  console.error("Database seed failed.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.runtime().close();
}
