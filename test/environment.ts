export const testEnvironment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://blueprint-test:blueprint-test@127.0.0.1:55433/blueprint_test",
  REDIS_URL: "redis://127.0.0.1:6379",
  RATE_LIMIT_KEY_SECRET: "test-rate-limit-secret-that-is-at-least-32-characters",
  JWT_SECRET: "test-jwt-secret-that-is-at-least-32-characters",
  REFRESH_SECRET: "test-refresh-secret-that-is-at-least-32-characters",
  APP_URL: "http://localhost:5173",
};
