import { Button } from "@/components/atoms/button";
import { EMAIL_MAX_LENGTH } from "@/lib/auth-validation";

export interface SignupEmailFormProps {
  placeholder?: string;
  submitLabel?: string;
}

/** Hands an address to `/signup?email=…` with a plain GET form, so it works before hydration. */
export function SignupEmailForm({
  placeholder = "prenom.nom@exemple.fr",
  submitLabel = "Commencer",
}: SignupEmailFormProps) {
  return (
    <form
      action="/signup"
      method="get"
      className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
    >
      <label className="flex-1">
        <span className="sr-only">Adresse e-mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          maxLength={EMAIL_MAX_LENGTH}
          placeholder={placeholder}
          className="field-input"
        />
      </label>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
