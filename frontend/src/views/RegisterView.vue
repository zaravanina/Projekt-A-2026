<template>
  <div>
    <h2>Register</h2>

    <form @submit.prevent="submit" class="form">
      <label>Email <input v-model="email" type="email" required /></label>
      <label>Name <input v-model="name" type="text" /></label>
      <label
        >Password <input v-model="password" type="password" required
      /></label>

      <button :disabled="loading" type="submit">Create user</button>
    </form>

    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const name = ref("");
const password = ref("");
const loading = ref(false);
const msg = ref("");

const submit = async () => {
  loading.value = true;
  msg.value = "";

  const body = new URLSearchParams({
    email: email.value,
    name: name.value,
    password: password.value,
  });

  const r = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "include",
    body,
  });

  // server returns HTML on success/failure, not JSON
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    msg.value = text || "Register failed";
    loading.value = false;
    return;
  }

  msg.value = "User created ✅ Redirecting to login...";
  setTimeout(() => router.push("/login"), 700);
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
