"use client";

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

/**
 * The account's own name, picture and email address.
 *
 * Two editable values, two different write endpoints and two different validation
 * rules — which is why this is not one generic form. Everything around them (the
 * row, the inline editor, the error and success slots) is `EditableRow`.
 */
export function UserInfoFields({
  user,
  onUpdateInfo,
  onChangeEmail,
}: {
  user: ApiUser;
  onUpdateInfo: (values: {
    name: string;
    image: string | null;
  }) => Promise<string>;
  onChangeEmail: (email: string) => Promise<string>;
}) {
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

          return onUpdateInfo({
            name: values.name,
            image: values.image || null,
          });
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

          return onChangeEmail(email);
        }}
      />
    </div>
  );
}
