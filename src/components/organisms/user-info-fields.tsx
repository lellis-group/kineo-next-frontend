"use client";

import { useRouter } from "next/navigation";
import { MailIcon, PencilIcon } from "@/components/atoms/icons";
import { EditableRow } from "@/components/molecules/editable-row";
import {
  EMAIL_ERROR_MESSAGE,
  EMAIL_MAX_LENGTH,
  IMAGE_HTTPS_ERROR_MESSAGE,
  IMAGE_MAX_LENGTH,
  isValidHttpsUrl,
  isValidName,
  NAME_ERROR_MESSAGE,
  NAME_MAX_LENGTH,
  NAME_PATTERN,
  normalizeEmail,
} from "@/lib/auth-validation";
import type { ApiUser } from "@/lib/types/api";
import { changeEmail, mapUserError, updateUserInfo } from "@/lib/user-service";

/**
 * The account's own name, picture and email address.
 *
 * Two editable values, two different write endpoints and two different validation
 * rules — which is why this is not one generic form. Everything around them (the
 * row, the inline editor, the error and success slots) is `EditableRow`.
 *
 * A write that succeeds needs the server-rendered header and profile refreshed,
 * since both show the name; the refresh is why these are mutations rather than
 * optimistic local state.
 */
export function UserInfoFields({ user }: { user: ApiUser }) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <EditableRow
        label="Nom"
        display={
          <>
            {user.name ?? "Non renseigné"}
            {user.image && (
              <span className="block truncate text-xs break-all text-faint">
                {user.image}
              </span>
            )}
          </>
        }
        editIcon={<PencilIcon className="h-3.5 w-3.5" />}
        editLabel="Modifier"
        submitLabel="Enregistrer"
        pendingLabel="En cours…"
        fields={[
          {
            name: "name",
            label: "Nom complet",
            value: user.name ?? "",
            required: true,
            maxLength: NAME_MAX_LENGTH,
            pattern: NAME_PATTERN,
            autoComplete: "name",
            placeholder: "Dr Jean Dupont",
          },
          {
            name: "image",
            label: "Image (URL https)",
            value: user.image ?? "",
            type: "url",
            maxLength: IMAGE_MAX_LENGTH,
            placeholder: "https://exemple.fr/photo.jpg",
          },
        ]}
        onSubmit={async (values) => {
          // Client-side mirror of the backend `before` hook validation, so the
          // obvious cases never cost a round trip. The backend still validates.
          if (!isValidName(values.name)) {
            throw new Error(NAME_ERROR_MESSAGE);
          }
          if (values.image && !isValidHttpsUrl(values.image)) {
            throw new Error(IMAGE_HTTPS_ERROR_MESSAGE);
          }

          try {
            await updateUserInfo({
              name: values.name,
              image: values.image || null,
            });
          } catch (err) {
            // better-auth rejects with a plain object, not an `Error`, so the
            // wording has to be chosen here rather than by the row.
            throw new Error(mapUserError(err));
          }
          router.refresh();
          return "Informations mises à jour.";
        }}
      />

      <EditableRow
        label="Email"
        display={user.email}
        editIcon={<MailIcon className="h-3.5 w-3.5" />}
        editLabel="Changer"
        submitLabel="Envoyer"
        pendingLabel="Envoi…"
        fields={[
          {
            name: "email",
            label: "Nouvel email",
            value: user.email,
            type: "email",
            required: true,
            maxLength: EMAIL_MAX_LENGTH,
            autoComplete: "email",
            placeholder: "jean.dupont@exemple.fr",
          },
        ]}
        onSubmit={async (values) => {
          const email = normalizeEmail(values.email);
          if (email.length > EMAIL_MAX_LENGTH) {
            throw new Error(EMAIL_ERROR_MESSAGE);
          }

          try {
            const { message } = await changeEmail(email);
            router.refresh();
            return message;
          } catch (err) {
            throw new Error(mapUserError(err));
          }
        }}
      />
    </div>
  );
}
