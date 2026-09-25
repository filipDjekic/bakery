import Link from 'next/link';

import { focusRingInsetClassName } from '@/components/ui/focus';
import { PageDescription, PageTitle } from '@/components/ui/typography';
import { BakeryProfileForm } from '@/features/settings/components/bakery-profile-form';
import { NotificationSettingsForm } from '@/features/settings/components/notification-settings-form';
import { OrderSettingsForm } from '@/features/settings/components/order-settings-form';
import { WorkingHoursEditor } from '@/features/settings/components/working-hours-editor';
import { cn } from '@/lib/cn';
import { getAdminSettings } from '@/server/queries/admin-settings';

const sections = [
  { href: '#profile', label: 'Profil' },
  { href: '#orders', label: 'Porudžbine' },
  { href: '#hours', label: 'Radno vreme' },
  { href: '#notifications', label: 'Obaveštenja' },
] as const;

export const instant = false;

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <PageTitle className="text-2xl sm:text-3xl lg:text-3xl">
          Podešavanja
        </PageTitle>
        <PageDescription className="mt-2 text-base sm:text-base">
          Upravljaj podacima pekare i načinom primanja porudžbina.
        </PageDescription>
      </header>

      <nav
        aria-label="Sekcije podešavanja"
        className="border-border bg-surface mt-6 grid grid-cols-2 gap-2 rounded-xl border p-2 sm:flex"
      >
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              'hover:bg-surface-muted min-h-11 rounded-lg px-3 py-2 text-center text-sm font-semibold sm:inline-flex sm:items-center',
              focusRingInsetClassName,
            )}
          >
            {section.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 space-y-8">
        <BakeryProfileForm settings={settings} />
        <OrderSettingsForm settings={settings} />
        <WorkingHoursEditor
          timezone={settings.timezone}
          initialIntervals={settings.businessHours.map(
            ({ weekday, openMinute, closeMinute }) => ({
              weekday,
              openMinute,
              closeMinute,
            }),
          )}
        />
        <NotificationSettingsForm
          notificationEmail={settings.notificationEmail}
          updatedAt={settings.updatedAt}
        />
      </div>
    </div>
  );
}
