/**
 * File data service — uploads, listings and the CV snapshot.
 *
 * Isomorphic like the other services: server components pass `serverTransport`
 * for reads; writes happen in the browser through the same-origin `/api` proxy.
 */

import {
  type ApiTransport,
  apiFetch,
  notFoundAs,
  uploadFetch,
} from "../api-client";
import type { ApiStoredFile } from "../types/api";

function single(field: string, file: File): FormData {
  const form = new FormData();
  form.append(field, file);
  return form;
}

function several(field: string, files: readonly File[]): FormData {
  const form = new FormData();
  for (const file of files) form.append(field, file);
  return form;
}

/** The path the browser loads through the same-origin proxy (cookie included). */
export function fileUrl(id: string): string {
  return `/api${filesApiPath(id)}`;
}

/** The CV attached to an application, without exposing its stored-file id. */
export function applicationCvUrl(applicationId: string): string {
  return `/api/applications/${encodeURIComponent(applicationId)}/cv`;
}

function filesApiPath(id: string): string {
  return `/files/${encodeURIComponent(id)}`;
}

export function fetchMyFiles(
  transport?: ApiTransport,
): Promise<ApiStoredFile[]> {
  return apiFetch<ApiStoredFile[]>("/files/mine", undefined, transport);
}

/** A closed or private listing answers 404; the caller renders an empty strip. */
export function fetchListingImages(
  listingId: string,
  transport?: ApiTransport,
): Promise<ApiStoredFile[]> {
  return apiFetch<ApiStoredFile[]>(
    `/files/listings/${encodeURIComponent(listingId)}/images`,
    undefined,
    transport,
  ).catch(notFoundAs<ApiStoredFile[]>([]));
}

export function uploadAvatar(
  file: File,
  transport?: ApiTransport,
): Promise<ApiStoredFile> {
  return uploadFetch<ApiStoredFile>(
    "/files/avatar",
    single("file", file),
    transport,
  );
}

export function uploadProfileCv(
  file: File,
  transport?: ApiTransport,
): Promise<ApiStoredFile> {
  return uploadFetch<ApiStoredFile>(
    "/files/cv",
    single("file", file),
    transport,
  );
}

export function uploadListingImages(
  listingId: string,
  files: readonly File[],
  transport?: ApiTransport,
): Promise<ApiStoredFile[]> {
  return uploadFetch<ApiStoredFile[]>(
    `/files/listings/${encodeURIComponent(listingId)}/images`,
    several("images", files),
    transport,
  );
}

/** Copies the caller's current profile CV onto an application it owns. */
export function attachCvToApplication(
  applicationId: string,
  transport?: ApiTransport,
): Promise<ApiStoredFile> {
  return apiFetch<ApiStoredFile>(
    `/applications/${encodeURIComponent(applicationId)}/cv`,
    { method: "POST" },
    transport,
  );
}

export function removeFile(
  id: string,
  transport?: ApiTransport,
): Promise<null> {
  return apiFetch<null>(filesApiPath(id), { method: "DELETE" }, transport);
}
