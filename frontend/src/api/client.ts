import axios from "axios";
import { mockData } from "./mockData";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

client.interceptors.request.use(async (config) => {
  // Simulate network latency
  await delay(500);

  const token = localStorage.getItem("af_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // ---- MOCK INTERCEPTOR LOGIC ----
  // If we are simulating, we will throw a specific error with mock data
  // so the response interceptor can catch it and return it as a successful response.
  // Axios doesn't have a clean built-in way to return mock data from a request interceptor 
  // without using a mock adapter library, but throwing a custom object works.
  
  const url = config.url || "";
  const method = config.method?.toLowerCase();

  let responseData: any = null;
  let status = 200;

  if (url.includes("/auth/login") && method === "post") {
    const { email } = JSON.parse(config.data || "{}");
    const user = mockData.users.find(u => u.email === email) || mockData.users[1]; // default admin
    responseData = { access_token: "mock-jwt-token", user };
  } else if (url.includes("/auth/me") && method === "get") {
    responseData = mockData.users[1]; // return admin by default for simulation
  } else if (url.includes("/dashboard") && method === "get") {
    responseData = mockData.dashboard;
  } else if (url.includes("/assets") && method === "get") {
    responseData = mockData.assets;
  } else if (url.includes("/employees") && method === "get") {
    responseData = mockData.users;
  } else if (url.includes("/transfers") && method === "get") {
    responseData = mockData.transfers;
  } else if (url.includes("/allocations") && method === "get") {
    responseData = mockData.allocations;
  } else if (url.includes("/departments") && method === "get") {
    responseData = mockData.departments;
  } else if (url.includes("/categories") && method === "get") {
    responseData = mockData.categories;
  } else if (url.includes("/maintenance") && method === "get") {
    responseData = mockData.maintenance;
  } else if (url.includes("/bookings") && method === "get") {
    responseData = mockData.bookings;
  } else if (url.includes("/audits") && method === "get") {
    responseData = mockData.audits;
  } else if (url.includes("/reports") && method === "get") {
    responseData = mockData.reports;
  } else if (url.includes("/notifications") && method === "get") {
    responseData = mockData.notifications;
  } else if (url.includes("/activity-logs") && method === "get") {
    responseData = mockData.dashboard.recent_activity;
  } else {
    // For POST/PUT/PATCH (mutations), just return a success response
    responseData = { success: true };
  }

  // We throw this custom object to short-circuit the actual network request
  throw {
    __isMockResponse: true,
    data: responseData,
    status,
    headers: {},
    config
  };
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Catch our mock responses
    if (error.__isMockResponse) {
      return Promise.resolve({
        data: error.data,
        status: error.status,
        headers: error.headers,
        config: error.config,
      });
    }

    if (error.response && error.response.status === 401) {
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  }
);

export default client;
