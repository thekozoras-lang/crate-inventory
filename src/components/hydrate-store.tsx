import { useEffect } from "react";
import { useInventory } from "@/lib/store";

export function HydrateStore() {
  useEffect(() => {
    const done = () => useInventory.getState().setHydrated(true);
    const result = useInventory.persist.rehydrate();
    if (result && typeof result.then === "function") {
      void result.then(done);
    } else {
      done();
    }
  }, []);
  return null;
}
