import { Button } from "@/components/atoms/button";
import { EMAIL_MAX_LENGTH } from "@/lib/auth-validation";

export interface SignupEmailFormProps {
  placeholder?: string;
  submitLabel?: string;
}

/**
 * Hands an address over to the signup form.
 *
 * A plain GET form, not a scripted one: the whole job is to navigate to
 * `/signup?email=…`, which is exactly what the browser does natively — so the
 * landing page needs no JavaScript for its call to action, and the field keeps
 * working before hydration. It was a client component with `useState` and
 * `useRouter` doing this by hand, which also meant the address it produced had
 * to be re-read on the far side.
 */
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
