"use client";

import { useEffect, useRef } from "react";
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";

type AlumniChangeRow = {
  id: number;
  alumni_updated_at: string | null;
  account_updated_at: string | null;
};

export function useAlumniRealtime(onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;
    if (!url) return;

    let disposed = false;
    let subscription: ReturnType<ReturnType<typeof createRealtimeClient>["subscribe"]> | undefined;
    const client = createRealtimeClient({ url });

    async function connect() {
      try {
        const response = await fetch("/api/realtime/alumni", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const sealedQuery = (await response.json()) as SealedLiveQuery<AlumniChangeRow>;
        if (disposed) return;

        subscription = client.subscribe(sealedQuery);
        subscription.onUpdate((update) => {
          if (!disposed && update.type === "changes") {
            onChangeRef.current();
          }
        });
      } catch (error) {
        console.error("Gagal menghubungkan sinkronisasi realtime alumni:", error);
      }
    }

    void connect();

    return () => {
      disposed = true;
      subscription?.unsubscribe();
      client.close();
    };
  }, []);
}
