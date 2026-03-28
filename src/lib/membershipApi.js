import api from "./api";

/**
 * Membership / Plans / Voucher / Trial API Service
 */

export const membershipService = {
  /* ─── Plans ─── */
  getPlans: async () => {
    const { data } = await api.get("/api/plans");
    return data;
  },

  getPlanById: async (id) => {
    const { data } = await api.get(`/api/plans/${id}`);
    return data;
  },

  createTransaction: async (planId) => {
    const { data } = await api.post(`/api/plans/${planId}/purchase`);
    return data;
  },

  /* ─── Trial ─── */
  activateTrial: async () => {
    const { data } = await api.post("/api/trials/activate");
    return data;
  },

  getTrialStatus: async () => {
    const { data } = await api.get("/api/trials/status");
    return data;
  },

  /* ─── Vouchers ─── */
  validateVoucher: async (code) => {
    const { data } = await api.post("/api/vouchers/validate", { code });
    return data;
  },

  getActiveVouchers: async () => {
    const { data } = await api.get("/api/vouchers/active");
    return data;
  },
};

export default membershipService;
