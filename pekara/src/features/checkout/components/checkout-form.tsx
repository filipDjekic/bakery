'use client';

import Link from 'next/link';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  createPendingSubmissionStore,
  type PendingSubmission,
} from '../lib/pending-submission';
import { createCheckoutIdempotency } from '../lib/idempotency-storage';

import { buttonVariants } from '@/components/ui/button';
import { cardVariants } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { SectionDescription, SectionTitle } from '@/components/ui/typography';
import { useCartHydration } from '@/features/cart/hooks/use-cart-hydration';
import { useCartStore } from '@/features/cart/store/cart-store';
import type {
  PickupAvailability,
  PickupSlot,
} from '@/server/services/pickup-slots';
import type { OrderConflictDetails, OrderErrorCode } from '@/types/order';
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
import { CheckoutConflicts } from './checkout-conflicts';
import { CheckoutSubmitButton } from './checkout-submit-button';
import { PickupSelector } from './pickup-selector';

type PickupSlotsResponse = {
  slots: PickupSlot[];
  bakeryTimezone: string;
};

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

function isAvailability(value: unknown): value is PickupAvailability {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<PickupAvailability>;
  return (
    typeof data.orderAcceptingEnabled === 'boolean' &&
    typeof data.bakeryTimezone === 'string' &&
    Array.isArray(data.dates) &&
    data.dates.every(
      (date) =>
        typeof date.date === 'string' &&
        typeof date.label === 'string' &&
        typeof date.shortDateLabel === 'string',
    ) &&
    (data.earliestSlot === null ||
      Boolean(
        data.earliestSlot &&
        typeof data.earliestSlot.value === 'string' &&
        typeof data.earliestSlot.dateLabel === 'string' &&
        typeof data.earliestSlot.label === 'string',
      ))
  );
}

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

export function CheckoutForm({
  pickupAvailability,
}: {
  pickupAvailability: PickupAvailability;
}) {
  const router = useRouter();
  const [idempotency] = useState(createCheckoutIdempotency);
  const [pendingStore] = useState(createPendingSubmissionStore);
  const pendingSubmission = useSyncExternalStore(
    pendingStore.subscribe,
    pendingStore.getSnapshot,
    pendingStore.getServerSnapshot,
  );
  const setPendingSubmission = pendingStore.set;
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [checkingSubmission, setCheckingSubmission] = useState(false);
  const items = useCartStore((state) => state.items);
  const consumeSubmitted = useCartStore((state) => state.consumeSubmitted);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateItemPrice = useCartStore((state) => state.updateItemPrice);
  const hasHydrated = useCartHydration();
  const requestController = useRef<AbortController>(null);
  const submitErrorRef = useRef<HTMLParagraphElement>(null);
  const submitting = useRef(false);
  const [availability, setAvailability] = useState(pickupAvailability);
  const [retryUntil, setRetryUntil] = useState(0);
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotLoadError, setSlotLoadError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState('');
  const [conflict, setConflict] = useState<{
    code: OrderErrorCode;
    details: OrderConflictDetails;
  } | null>(null);
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

  useEffect(() => {
    if (errors.root?.message) submitErrorRef.current?.focus();
  }, [errors.root?.message]);

  const loadSlots = useCallback(
    async (date: string, preserveTime = '') => {
      requestController.current?.abort();
      setSelectedDate(date);
      setSelectedTime('');
      setValue('pickupDate', date, { shouldValidate: true });
      setValue('pickupAt', '');
      clearErrors('pickupAt');
      setSubmitMessage('');
      setSlots([]);
      setSlotLoadError(null);

      const controller = new AbortController();
      requestController.current = controller;
      setIsLoadingSlots(true);

      try {
        const signal = AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(10_000),
        ]);
        const [availabilityResponse, response] = await Promise.all([
          fetch('/api/pickup-availability', { signal, cache: 'no-store' }),
          date
            ? fetch(`/api/pickup-slots?date=${encodeURIComponent(date)}`, {
                signal,
                cache: 'no-store',
              })
            : Promise.resolve(null),
        ]);
        const fresh: unknown = await availabilityResponse.json();
        if (!availabilityResponse.ok || !isAvailability(fresh))
          throw new Error('Invalid availability');
        if (requestController.current !== controller) return;
        setAvailability(fresh);
        if (!date || !response) return;
        if (!fresh.dates.some((option) => option.date === date)) {
          setSelectedDate('');
          setValue('pickupDate', '');
          return;
        }
        const data: unknown = await response.json();

        if (!response.ok || !isPickupSlotsResponse(data)) {
          throw new Error('Pickup slot response is invalid.');
        }

        if (requestController.current !== controller) {
          return;
        }

        setSlots(data.slots);
        if (
          preserveTime &&
          data.slots.some((slot) => slot.value === preserveTime)
        ) {
          setSelectedTime(preserveTime);
          setValue('pickupAt', preserveTime);
        }
      } catch (error) {
        if (requestController.current !== controller) return;
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
    },
    [setValue, clearErrors],
  );

  useEffect(() => {
    const refresh = () => {
      if (!submitting.current && document.visibilityState === 'visible')
        void loadSlots(selectedDate, selectedTime);
    };
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [selectedDate, selectedTime, loadSlots]);

  useEffect(() => {
    if (!retryUntil) return;
    const timer = window.setTimeout(
      () => setRetryUntil(0),
      Math.max(0, retryUntil - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [retryUntil]);

  function resolveConflict(productId: string) {
    const remaining =
      conflict?.details.items.filter((item) => item.productId !== productId) ??
      [];
    setConflict(
      remaining.length && conflict
        ? { ...conflict, details: { items: remaining } }
        : null,
    );
    if (!remaining.length) clearErrors('root');
  }

  async function submitOrder(values: CheckoutFormValues) {
    if (submitting.current || pendingSubmission || retryUntil > 0) return;
    submitting.current = true;
    setSubmitMessage('');
    clearErrors('root');
    const submittedItems = items.map((item) => ({ ...item }));
    try {
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
          displayUnitLabel: item.unitLabel ?? null,
        })),
      };
      const signature = await createDraftSignature(draft);
      const idempotencyKey = idempotency.keyFor(signature);

      const submission: PendingSubmission = {
        request: { idempotencyKey, ...draft },
        items: submittedItems,
        pickupDate: values.pickupDate,
      };
      setPendingSubmission(submission);
      await sendSubmission(submission);
    } catch (error) {
      showSubmissionError(error);
    } finally {
      submitting.current = false;
    }
  }

  function showSubmissionError(error: unknown) {
    const message =
      error instanceof CreateOrderApiError
        ? (orderErrorMessages[error.code] ?? error.message)
        : 'Mrežna greška. Proverite vezu i proverite poslatu porudžbinu.';
    setError('root', { message });
    toast.error(message);
    setSubmitMessage('Korpa je sačuvana.');
  }

  async function sendSubmission(submission: PendingSubmission) {
    try {
      const confirmation = await createOrderRequest(submission.request);
      idempotency.complete(submission.request.idempotencyKey);
      setPendingSubmission(null);
      consumeSubmitted(submission.items);
      setConfirmedOrderId(confirmation.orderId);
      toast.success('Porudžbina je uspešno kreirana.');
      try {
        router.push(`/porudzbina/${confirmation.orderId}`);
      } catch {
        /* A status link remains available if navigation fails. */
      }
    } catch (error) {
      if (error instanceof CreateOrderApiError) {
        if (error.code !== 'INTERNAL_ERROR' && error.code !== 'RATE_LIMITED') {
          setPendingSubmission(null);
        }
        if (
          error.code === 'INVALID_PICKUP_SLOT' ||
          error.code === 'ORDERS_DISABLED'
        )
          await loadSlots(submission.pickupDate);
        if (error.code === 'RATE_LIMITED')
          setRetryUntil(
            Date.now() + Math.min(3600, error.retryAfterSeconds ?? 60) * 1000,
          );
        if (
          (error.code === 'PRICE_CHANGED' ||
            error.code === 'PRODUCT_UNAVAILABLE') &&
          error.details
        )
          setConflict({ code: error.code, details: error.details });
      }
      showSubmissionError(error);
    }
  }

  async function retrySubmission() {
    if (!pendingSubmission || submitting.current || retryUntil > 0) return;
    submitting.current = true;
    clearErrors('root');
    setCheckingSubmission(true);
    try {
      await sendSubmission(pendingSubmission);
    } finally {
      submitting.current = false;
      setCheckingSubmission(false);
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

  if (confirmedOrderId)
    return (
      <div role="status">
        <p>Porudžbina je uspešno kreirana.</p>
        <Link href={`/porudzbina/${confirmedOrderId}`}>Prati porudžbinu</Link>
      </div>
    );

  if (items.length === 0 && !pendingSubmission) {
    return (
      <div
        className={cardVariants({
          variant: 'muted',
          className: 'px-6 py-12 text-center sm:px-10',
        })}
      >
        <SectionTitle className="text-xl">Korpa je prazna</SectionTitle>
        <SectionDescription className="mx-auto mt-3 max-w-lg">
          Dodajte bar jedan proizvod pre nego što nastavite sa poručivanjem.
        </SectionDescription>
        <Link
          href="/proizvodi"
          className={buttonVariants({ className: 'mt-6' })}
        >
          Pogledaj proizvode
        </Link>
      </div>
    );
  }

  const dateRegistration = register('pickupDate');
  const timeRegistration = register('pickupAt');

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {pendingSubmission ? (
        <section
          className="lg:col-span-2"
          aria-label="Provera poslate porudžbine"
        >
          <p>
            Odgovor na prethodno slanje nije potvrđen. Proverite poslatu
            porudžbinu pre novog slanja.
          </p>
          <button
            type="button"
            disabled={retryUntil > 0 || checkingSubmission || isSubmitting}
            className={buttonVariants()}
            onClick={() => {
              void retrySubmission();
            }}
          >
            {checkingSubmission
              ? 'Provera je u toku…'
              : 'Proveri poslatu porudžbinu'}
          </button>
        </section>
      ) : null}
      <form
        noValidate
        onSubmit={(event) => {
          void handleSubmit(submitOrder)(event);
        }}
        className="min-w-0 space-y-6"
      >
        <section className={cardVariants({ className: 'p-5 sm:p-7' })}>
          <h2 className="text-foreground text-xl font-bold">1. Kontakt</h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="customerName" className="text-sm font-semibold">
                Ime i prezime
              </label>
              <Input
                {...register('customerName')}
                id="customerName"
                autoComplete="name"
                aria-invalid={errors.customerName ? true : undefined}
                aria-describedby={
                  errors.customerName ? 'customerName-error' : undefined
                }
                className="mt-2"
              />
              {errors.customerName ? (
                <p
                  id="customerName-error"
                  className="mt-2 text-sm text-red-700"
                >
                  {errors.customerName.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="customerPhone" className="text-sm font-semibold">
                Telefon
              </label>
              <Input
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
                className="mt-2"
              />
              {errors.customerPhone ? (
                <p
                  id="customerPhone-error"
                  className="mt-2 text-sm text-red-700"
                >
                  {errors.customerPhone.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="customerEmail" className="text-sm font-semibold">
                Email <span className="text-muted font-normal">(opciono)</span>
              </label>
              <Input
                {...register('customerEmail')}
                id="customerEmail"
                type="email"
                autoComplete="email"
                aria-invalid={errors.customerEmail ? true : undefined}
                aria-describedby={
                  errors.customerEmail ? 'customerEmail-error' : undefined
                }
                className="mt-2"
              />
              {errors.customerEmail ? (
                <p
                  id="customerEmail-error"
                  className="mt-2 text-sm text-red-700"
                >
                  {errors.customerEmail.message}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="note" className="text-sm font-semibold">
                Napomena{' '}
                <span className="text-muted font-normal">(opciono)</span>
              </label>
              <Textarea
                {...register('note')}
                id="note"
                rows={4}
                maxLength={500}
                aria-invalid={errors.note ? true : undefined}
                aria-describedby={errors.note ? 'note-error' : undefined}
                className="mt-2"
              />
              {errors.note ? (
                <p id="note-error" className="mt-2 text-sm text-red-700">
                  {errors.note.message}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <PickupSelector
          availability={availability}
          dateRegistration={dateRegistration}
          timeRegistration={timeRegistration}
          dateError={errors.pickupDate}
          timeError={errors.pickupAt}
          slots={slots}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          isLoading={isLoadingSlots}
          loadError={slotLoadError}
          onDateChange={(date) => {
            if (!submitting.current) void loadSlots(date);
          }}
          onTimeChange={(value) => {
            if (submitting.current) return;
            setSelectedTime(value);
            setValue('pickupAt', value, { shouldValidate: true });
            clearErrors('pickupAt');
          }}
        />

        <div className="lg:hidden">
          <CheckoutCartSummary items={items} collapsible />
        </div>

        {conflict ? (
          <CheckoutConflicts
            code={conflict.code}
            details={conflict.details}
            cartNames={
              new Map(items.map((item) => [item.productId, item.name]))
            }
            onAcceptAll={() => {
              const remaining = conflict.details.items.filter(
                (item) => item.currentPriceMinor === undefined,
              );
              for (const item of conflict.details.items)
                if (item.currentPriceMinor !== undefined)
                  updateItemPrice(item.productId, item.currentPriceMinor);
              setConflict(
                remaining.length
                  ? { ...conflict, details: { items: remaining } }
                  : null,
              );
              if (!remaining.length) clearErrors('root');
            }}
            onAcceptPrice={(id, price) => {
              updateItemPrice(id, price);
              resolveConflict(id);
            }}
            onRemove={(id) => {
              removeItem(id);
              resolveConflict(id);
            }}
          />
        ) : null}

        {errors.root?.message ? (
          <p
            ref={submitErrorRef}
            role="alert"
            tabIndex={-1}
            className="mt-5 text-sm text-red-700 focus:outline-none"
          >
            {errors.root.message}
          </p>
        ) : null}
        <p role="status" aria-live="polite" className="mt-5 min-h-6 text-sm">
          {submitMessage}
        </p>

        <p className="text-muted text-sm">
          Plaćanje je prilikom preuzimanja u pekari.
        </p>
        <CheckoutSubmitButton
          disabled={
            Boolean(pendingSubmission) ||
            Boolean(conflict?.details.items.length) ||
            isSubmitting ||
            isLoadingSlots ||
            slots.length === 0 ||
            !selectedTime ||
            !availability.orderAcceptingEnabled ||
            retryUntil > 0
          }
          isSubmitting={isSubmitting}
        />
      </form>

      <div className="hidden lg:block">
        <CheckoutCartSummary items={items} />
      </div>
    </div>
  );
}
