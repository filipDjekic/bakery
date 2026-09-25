type CheckoutSubmitButtonProps = {
  disabled: boolean;
  isSubmitting: boolean;
};

export function CheckoutSubmitButton({
  disabled,
  isSubmitting,
}: CheckoutSubmitButtonProps) {
  return (
    <Button type="submit" disabled={disabled} size="lg" className="mt-6 w-full">
      {isSubmitting ? 'Slanje porudžbine…' : 'Pošalji porudžbinu'}
    </Button>
  );
}
import { Button } from '@/components/ui/button';
