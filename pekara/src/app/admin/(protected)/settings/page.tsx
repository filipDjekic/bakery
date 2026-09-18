import { BakeryProfileForm } from '@/features/settings/components/bakery-profile-form';
import { OrderSettingsForm } from '@/features/settings/components/order-settings-form';
import { WorkingHoursEditor } from '@/features/settings/components/working-hours-editor';
import { getAdminSettings } from '@/server/queries/admin-settings';

export const instant = false;

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Podešavanja pekare</h1>
        <p className="text-muted mt-1 text-sm">
          Profil, pravila poručivanja i nedeljno radno vreme.
        </p>
      </div>
      <div className="space-y-8">
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
      </div>
    </div>
  );
}
