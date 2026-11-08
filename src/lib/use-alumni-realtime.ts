"use client";

import { useEffect, useRef } from "react";
import { createRealtimeClient, type MaterializedLiveQuerySubscription, type SealedLiveQuery } from "@neon/realtime/client";

type AlumniChangeRow = {
  id: number;
  alumni_updated_at: string | null;
  account_updated_at: string | null;
};

const RENEW_EARLY_MS = 10_000;
const RENEW_RETRY_MS = 1_000;

export function useAlumniRealtime(onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;
    if (!url) return;

    let disposed = false;
    let subscription: MaterializedLiveQuerySubscription<AlumniChangeRow> | undefined;
    let renewalTimer: ReturnType<typeof setTimeout> | undefined;
    const client = createRealtimeClient({ url });

    async function fetchSealedQuery(): Promise<SealedLiveQuery<AlumniChangeRow>> {
      const response = await fetch("/api/realtime/alumni", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`Gagal memperbarui token Realtime (HTTP ${response.status}).`);
      }
      return (await response.json()) as SealedLiveQuery<AlumniChangeRow>;
    }

    function scheduleRenewal(expiresAt: number, delayOverride?: number) {
      if (renewalTimer) clearTimeout(renewalTimer);
      if (disposed) return;
      const delay = delayOverride ?? Math.max(0, expiresAt - Date.now() - RENEW_EARLY_MS);
      renewalTimer = setTimeout(() => void renewSubscription(), delay);
    }

    async function renewSubscription() {
      if (disposed || !subscription) return;
      let nextQuery: SealedLiveQuery<AlumniChangeRow>;
      try {
        nextQuery = await fetchSealedQuery();
      } catch (error) {
        console.error("Gagal memperbarui token Neon Realtime alumni:", error);
        scheduleRenewal(0, RENEW_RETRY_MS);
        return;
      }

      if (disposed || !subscription) return;
      scheduleRenewal(nextQuery.expiresAt);
      try {
        await subscription.renew(nextQuery);
      } catch (error) {
        console.error("Langganan Neon Realtime alumni berhenti saat pembaruan token:", error);
        if (renewalTimer) clearTimeout(renewalTimer);
      }
    }

    async function connect() {
      try {
        const sealedQuery = await fetchSealedQuery();
        if (disposed) return;

        subscription = client.subscribe(sealedQuery);
        subscription.onUpdate((update) => {
          if (!disposed && update.type === "changes") {
            onChangeRef.current();
          }
        });
        scheduleRenewal(sealedQuery.expiresAt);
      } catch (error) {
        console.error("Gagal menghubungkan sinkronisasi realtime alumni:", error);
      }
    }

    void connect();

    return () => {
      disposed = true;
      if (renewalTimer) clearTimeout(renewalTimer);
      subscription?.unsubscribe();
      client.close();
    };
  }, []);
}
