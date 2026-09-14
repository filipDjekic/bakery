import { db } from "@/prisma/db";

export type HomepageCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type HomepageBusinessHours = {
  weekday: number;
  openMinute: number;
  closeMinute: number;
};

function getWeekdayInTimezone(timezone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(new Date());

  const weekdays: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return weekdays[weekday] ?? 1;
}

export async function getHomepageData() {
  const settings = await db.orm.public.BakerySettings
    .include("businessHours", (hours) =>
      hours.orderBy((hour) => hour.openMinute.asc()),
    )
    .where({
      id: "default",
    })
    .first();

  if (!settings) {
    throw new Error("BakerySettings with id 'default' does not exist.");
  }

  const categoryRows = await db.orm.public.Category
    .where({
      isActive: true,
    })
    .orderBy((category) => category.sortOrder.asc())
    .all();

  const categories: HomepageCategory[] = categoryRows
    .slice(0, 4)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
    }));

  const todayWeekday = getWeekdayInTimezone(settings.timezone);

  const todayBusinessHours: HomepageBusinessHours[] =
    settings.businessHours
      .filter((hours) => hours.weekday === todayWeekday)
      .map((hours) => ({
        weekday: hours.weekday,
        openMinute: hours.openMinute,
        closeMinute: hours.closeMinute,
      }));

  return {
    settings,
    categories,
    todayBusinessHours,
  };
}
