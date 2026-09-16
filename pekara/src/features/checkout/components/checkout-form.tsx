'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useCartHydration } from '@/features/cart/hooks/use-cart-hydration';
import { useCartStore } from '@/features/cart/store/cart-store';
import type { PickupSlot } from '@/server/services/pickup-slots';
import {
  checkoutFormSchema,
  type CheckoutFormInput,
  type CheckoutFormValues,
} from '@/validation/checkout';

import {
  createDraftSignature,
  CreateOrderApiError,
  createOrderRequest,
} from '../api/create-order';
import { CheckoutCartSummary } from './checkout-cart-summary';
import { CheckoutSubmitButton } from './checkout-submit-button';
import { PickupSelector } from './pickup-selector';

type PickupSlotsResponse = {
  slots: PickupSlot[];
  bakeryTimezone: string;
};

const inputClassName =
  'border-border bg-surface text-foreground focus-visible:ring-primary mt-2 min-h-11 w-full rounded-md border px-3 py-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none';
const IDEMPOTENCY_SESSION_KEY = 'bakery:checkout-idempotency';

const orderErrorMessages: Partial<Record<CreateOrderApiError['code'], string>> =
  {
    VALIDATION_ERROR: 'Proverite unesene podatke i pokušajte ponovo.',
    PRODUCT_UNAVAILABLE:
      'Jedan ili više proizvoda više nisu dostupni. Vratite se u korpu.',
    PRICE_CHANGED:
      'Cena jednog ili više proizvoda je promenjena. Osvežite korpu pre ponovnog slanja.',
    INVALID_PICKUP_SLOT:
      'Izabrani termin više nije dostupan. Izaberite novi termin.',
    ORDERS_DISABLED: 'Pekara trenutno ne prima nove porudžbine.',
    IDEMPOTENCY_CONFLICT:
      'Podaci su promenjeni tokom ponovnog slanja. Pokušajte još jednom.',
    RATE_LIMITED: 'Previše pokušaja. Sačekajte pre ponovnog slanja.',
    INTERNAL_ERROR:
      'Porudžbinu trenutno nije moguće poslati. Pokušajte ponovo.',
  };

function isPickupSlotsResponse(value: unknown): value is PickupSlotsResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as Partial<PickupSlotsResponse>;
  return (
    typeof response.bakeryTimezone === 'string' &&
    Array.isArray(response.slots) &&
    response.slots.every(
      (slot) =>
        Boolean(slot) &&
        typeof slot.value === 'string' &&
        typeof slot.label === 'string',
    )
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const hasHydrated = useCartHydration();
  const requestController = useRef<AbortController>(null);
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [bakeryTimezone, setBakeryTimezone] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotLoadError, setSlotLoadError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormInput, unknown, CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      note: '',
      pickupDate: '',
      pickupAt: '',
    },
  });

  useEffect(
    () => () => {
      requestController.current?.abort();
    },
    [],
  );

  async function loadSlots(date: string) {
    requestController.current?.abort();
    setSelectedDate(date);
    setValue('pickupAt', '');
    clearErrors('pickupAt');
    setSubmitMessage('');
    setSlots([]);
    setBakeryTimezone(null);
    setSlotLoadError(null);

    if (!date) {
      setIsLoadingSlots(false);
      return;
    }

    const controller = new AbortController();
    requestController.current = controller;
    setIsLoadingSlots(true);

    try {
      const response = await fetch(
        `/api/pickup-slots?date=${encodeURIComponent(date)}`,
        { signal: controller.signal },
      );
      const data: unknown = await response.json();

      if (!response.ok || !isPickupSlotsResponse(data)) {
        throw new Error('Pickup slot response is invalid.');
      }

      if (requestController.current !== controller) {
        return;
      }

      setSlots(data.slots);
      setBakeryTimezone(data.bakeryTimezone);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setSlotLoadError(
        'Termine trenutno nije moguće učitati. Pokušajte ponovo.',
      );
    } finally {
      if (requestController.current === controller) {
        setIsLoadingSlots(false);
      }
    }
  }

  async function submitOrder(values: CheckoutFormValues) {
    setSubmitMessage('');
    clearErrors('root');

    const draft = {
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      customerEmail: values.customerEmail,
      note: values.note,
      pickupAt: values.pickupAt,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        displayPriceMinor: item.displayPriceMinor,
      })),
    };
    const signature = await createDraftSignature(draft);
    let idempotencyKey = crypto.randomUUID();

    try {
      const stored = sessionStorage.getItem(IDEMPOTENCY_SESSION_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : null;

      if (
        parsed &&
        typeof parsed === 'object' &&
        'signature' in parsed &&
        'idempotencyKey' in parsed &&
        parsed.signature === signature &&
        typeof parsed.idempotencyKey === 'string'
      ) {
        idempotencyKey = parsed.idempotencyKey;
      }
    } catch {
      sessionStorage.removeItem(IDEMPOTENCY_SESSION_KEY);
    }

    sessionStorage.setItem(
      IDEMPOTENCY_SESSION_KEY,
      JSON.stringify({ signature, idempotencyKey }),
    );

    try {
      const confirmation = await createOrderRequest({
        idempotencyKey,
        ...draft,
      });

      sessionStorage.removeItem(IDEMPOTENCY_SESSION_KEY);
      clearCart();
      router.push(`/porudzbina/${confirmation.orderId}`);
    } catch (error) {
      const message =
        error instanceof CreateOrderApiError
          ? (orderErrorMessages[error.code] ?? error.message)
          : 'Mrežna greška. Proverite vezu i pokušajte ponovo.';

      setError('root', {
        message,
      });
      setSubmitMessage('Korpa je sačuvana i možete pokušati ponovo.');
    }
  }

  if (!hasHydrated) {
    return (
      <div role="status" aria-busy="true" className="animate-pulse">
        <span className="sr-only">Učitavanje checkout-a</span>
        <div className="border-border bg-surface-muted h-72 rounded-xl border" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border-border bg-surface-muted rounded-xl border px-6 py-12 text-center sm:px-10">
        <h2 className="text-foreground text-xl font-semibold">
          Korpa je prazna
        </h2>
        <p className="text-muted mx-auto mt-3 max-w-lg leading-7">
          Dodajte bar jedan proizvod pre nego što nastavite sa poručivanjem.
        </p>
        <Link
          href="/proizvodi"
          className="bg-primary hover:bg-primary-hover focus-visible:ring-primary mt-6 inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Pogledaj proizvode
        </Link>
      </div>
    );
  }

  const dateRegistration = register('pickupDate');
  const timeRegistration = register('pickupAt');

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <form
        noValidate
        onSubmit={handleSubmit(submitOrder)}
        className="border-border bg-surface rounded-xl border p-5 sm:p-7"
      >
        <h2 className="text-foreground text-xl font-semibold">
          Kontakt podaci
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="customerName" className="text-sm font-semibold">
              Ime i prezime
            </label>
            <input
              {...register('customerName')}
              id="customerName"
              autoComplete="name"
              aria-invalid={errors.customerName ? true : undefined}
              aria-describedby={
                errors.customerName ? 'customerName-error' : undefined
              }
              className={inputClassName}
            />
            {errors.customerName ? (
              <p id="customerName-error" className="mt-2 text-sm text-red-700">
                {errors.customerName.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="customerPhone" className="text-sm font-semibold">
              Telefon
            </label>
            <input
              {...register('customerPhone')}
              id="customerPhone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="064 123 4567"
              aria-invalid={errors.customerPhone ? true : undefined}
              aria-describedby={
                errors.customerPhone ? 'customerPhone-error' : undefined
              }
              className={inputClassName}
            />
            {errors.customerPhone ? (
              <p id="customerPhone-error" className="mt-2 text-sm text-red-700">
                {errors.customerPhone.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="customerEmail" className="text-sm font-semibold">
              Email <span className="text-muted font-normal">(opciono)</span>
            </label>
            <input
              {...register('customerEmail')}
              id="customerEmail"
              type="email"
              autoComplete="email"
              aria-invalid={errors.customerEmail ? true : undefined}
              aria-describedby={
                errors.customerEmail ? 'customerEmail-error' : undefined
              }
              className={inputClassName}
            />
            {errors.customerEmail ? (
              <p id="customerEmail-error" className="mt-2 text-sm text-red-700">
                {errors.customerEmail.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="note" className="text-sm font-semibold">
              Napomena <span className="text-muted font-normal">(opciono)</span>
            </label>
            <textarea
              {...register('note')}
              id="note"
              rows={4}
              maxLength={500}
              aria-invalid={errors.note ? true : undefined}
              aria-describedby={errors.note ? 'note-error' : undefined}
              className={`${inputClassName} resize-y`}
            />
            {errors.note ? (
              <p id="note-error" className="mt-2 text-sm text-red-700">
                {errors.note.message}
              </p>
            ) : null}
          </div>
        </div>

        <PickupSelector
          dateRegistration={dateRegistration}
          timeRegistration={timeRegistration}
          dateError={errors.pickupDate}
          timeError={errors.pickupAt}
          slots={slots}
          bakeryTimezone={bakeryTimezone}
          isLoading={isLoadingSlots}
          loadError={slotLoadError}
          hasSelectedDate={selectedDate.length > 0}
          onDateChange={(date) => void loadSlots(date)}
        />

        {errors.root?.message ? (
          <p role="alert" className="mt-5 text-sm text-red-700">
            {errors.root.message}
          </p>
        ) : null}
        <p role="status" aria-live="polite" className="mt-5 min-h-6 text-sm">
          {submitMessage}
        </p>

        <CheckoutSubmitButton
          disabled={isSubmitting || isLoadingSlots || slots.length === 0}
          isSubmitting={isSubmitting}
        />
      </form>

      <CheckoutCartSummary items={items} />
    </div>
  );
}
