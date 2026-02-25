import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import CheckEmailView from "../views/CheckEmailView.vue";
import DashboardView from "../views/DashboardView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/login" },
    { path: "/login", component: LoginView },
    { path: "/register", component: RegisterView },
    { path: "/check-email", component: CheckEmailView },
    { path: "/dashboard", component: DashboardView },
  ],
});

// Simple auth guard for dashboard
router.beforeEach(async (to) => {
  if (to.path !== "/dashboard") return true;

  const r = await fetch("/api/session", { credentials: "include" });
  if (!r.ok) return "/login";
  const data = await r.json();

  if (data?.isAuthed) return true;
  return "/login";
});

export default router;
