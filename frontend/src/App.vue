<template>
  <div class="wrap">
    <header class="top">
      <h1>Secure App</h1>
      <nav class="nav">
        <RouterLink to="/register">Register</RouterLink>
        <RouterLink to="/login">Login</RouterLink>
        <RouterLink to="/dashboard">Dashboard</RouterLink>
      </nav>
    </header>

    <main class="card">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<style scoped>
.wrap {
  max-width: 980px;
  margin: 24px auto;
  padding: 0 16px;
  font-family: system-ui, sans-serif;
}
.top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.nav {
  display: flex;
  gap: 12px;
}
.card {
  margin-top: 16px;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 16px;
}
a.router-link-active {
  font-weight: 700;
}
</style>
