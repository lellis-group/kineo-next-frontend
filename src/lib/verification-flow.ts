/** What a verification link is for, as the backend labelled it. */
export type VerificationFlow = "change-email" | "change-email-approval";

export function isAddressChangeFlow(
  flow: string | null | undefined,
): flow is VerificationFlow {
  return flow === "change-email" || flow === "change-email-approval";
}

export function isApprovalFlow(
  flow: string | null | undefined,
): flow is "change-email-approval" {
  return flow === "change-email-approval";
}
