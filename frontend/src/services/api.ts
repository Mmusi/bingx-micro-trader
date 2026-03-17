// services/api.ts — Axios wrapper for backend REST API

import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const botAPI = {
  start:    () => api.post('/bot/start'),
  stop:     () => api.post('/bot/stop'),
  status:   () => api.get('/bot/status'),
  cycle:    () => api.post('/bot/cycle'),
};

export const tradeAPI = {
  active:   () => api.get('/trades/active'),
  history:  (limit = 100) => api.get(`/trades/history?limit=${limit}`),
  stats:    () => api.get('/trades/stats'),
  close:    (id: string) => api.post(`/trades/close/${id}`),
};

export const marketAPI = {
  candles: (symbol: string, interval: string, limit = 100) =>
    api.get(`/market/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`),
  ticker: (symbol: string) =>
    api.get(`/market/ticker?symbol=${symbol}`),
};

export const accountAPI = {
  balance:   () => api.get('/account/balance'),
  positions: () => api.get('/account/positions'),
};

export const settingsAPI = {
  getPairs:    () => api.get('/settings/pairs'),
  updatePairs: (pairs: any) => api.post('/settings/pairs', pairs),
};

export const signalAPI = {
  queue: () => api.get('/signals/queue'),
};
