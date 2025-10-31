// // hooks/useHasHydrated.ts
// import { useEffect, useState } from 'react'
// import { useCartStore } from '@/store/cartStore'

// export function useHasHydrated() {
//     const [hydrated, setHydrated] = useState(false)

//     useEffect(() => {
//         // Subscribe to the hydration event
//         const unsub = useCartStore.persist.onFinishHydration(() => {
//             setHydrated(true)
//         })

//         // If it's already hydrated (e.g., after a fast reload)
//         if (useCartStore.persist.hasHydrated()) {
//             setHydrated(true)
//         }

//         return () => {
//             unsub?.()
//         }
//     }, [])

//     return hydrated
// }



// hooks/useHasHydrated.ts (Revised for SSR Safety)
import { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cartStore'

export function useHasHydrated() {
    // 1. Safely initialize state: Check if in browser AND if persist is available.
    // If not in the browser or persist is undefined, default to false.
    const initialHydrated =
        typeof window !== 'undefined' && useCartStore.persist
            ? useCartStore.persist.hasHydrated()
            : false;

    const [hydrated, setHydrated] = useState(initialHydrated);

    useEffect(() => {
        // This useEffect block only runs on the client (browser).

        // 2. Check for the existence of .persist again inside useEffect (safety check)
        if (useCartStore.persist && !hydrated) {

            // Subscribe to the hydration event
            const unsub = useCartStore.persist.onFinishHydration(() => {
                setHydrated(true);
            });

            // If it was already hydrated before the subscription, update state immediately
            if (useCartStore.persist.hasHydrated()) {
                setHydrated(true);
            }

            return () => {
                unsub();
            }
        }

        // If we reach here and persist is unavailable, assume component is client-side 
        // and set to true so the UI renders based on the (likely empty) default state.
        // However, the conditional rendering in CartPage handles the initial wait better.

    }, [hydrated]);

    return hydrated;
}