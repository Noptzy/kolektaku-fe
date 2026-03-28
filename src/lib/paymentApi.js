import api from './api';

export const createPayment = async (planId, voucherCode = "") => {
    const response = await api.post('/api/payments/saweria', { planId, voucherCode });
    return response.data;
};

export const checkPaymentStatus = async (snapId) => {
    const response = await api.get(`/api/payments/saweria/${snapId}/status`);
    return response.data;
};
