type CheckoutSubmitButtonProps = {
  disabled: boolean;
  isSubmitting: boolean;
};

export function CheckoutSubmitButton({
  disabled,
  isSubmitting,
}: CheckoutSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="bg-primary hover:bg-primary-hover focus-visible:ring-primary mt-6 min-h-12 w-full rounded-md px-5 py-3 text-base font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSubmitting ? 'Slanje porudžbine…' : 'Pošalji porudžbinu'}
    </button>
  );
}
