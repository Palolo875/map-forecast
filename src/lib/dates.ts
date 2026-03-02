import { format, parseISO } from "date-fns";

export function formatDateTime(ts: number) {
  return format(new Date(ts), "yyyy-MM-dd HH:mm");
}

export function formatDate(ts: number) {
  return format(new Date(ts), "yyyy-MM-dd");
}

export function parseIsoToTs(iso: string) {
  return parseISO(iso).getTime();
}
