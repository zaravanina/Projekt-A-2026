<template>
  <div>
    <h2>Login</h2>

    <form @submit.prevent="submit" class="form">
      <label>Email <input v-model="email" type="email" required /></label>
      <label
        >Password <input v-model="password" type="password" required
      /></label>

      <button :disabled="loading" type="submit">Send login link</button>
    </form>

    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const password = ref("");
const loading = ref(false);
const msg = ref("");

const submit = async () => {
  loading.value = true;
  msg.value = "";

  const r = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: email.value, password: password.value }),
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    msg.value = data?.error ?? "Login failed";
    loading.value = false;
    return;
  }

  router.push("/check-email");
  loading.value = false;
};
</script>

<style scoped>
.form {
  display: grid;
  gap: 10px;
  max-width: 420px;
}
input {
  width: 100%;
  padding: 8px;
}
button {
  padding: 8px 12px;
}
.msg {
  margin-top: 12px;
}
</style>
