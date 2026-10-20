/** Swap this adapter for hosted queries later; UI uses a single subscription/mutation boundary. */
export { useDB as usePlatformData, mutate as updatePlatformData, resetDemo } from "@/lib/demo/store";
export { getCustomerOrder, ensureCustomerLink, requestAddress, submitComplaint, updateComplaint, reviewAddress } from "@/lib/demo/customer";