import axios from "axios";

// Default to V1 API prefix
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("af_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    // Global fix: The frontend components expect flat arrays, but the backend 
    // returns paginated objects like { items: [...], total: X }.
    // We seamlessly unwrap it here so no components crash.
    if (response.data && Array.isArray(response.data.items)) {
      response.data = response.data.items;
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and trigger logout event
      localStorage.removeItem("af_token");
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  }
);

export default client;
