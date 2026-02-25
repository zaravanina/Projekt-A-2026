<template>
  <div>
    <h2>Dashboard</h2>

    <div v-if="loading">Loading...</div>

    <div v-else>
      <p><b>Email:</b> {{ user?.email }}</p>

      <label class="row">
        Name:
        <input v-model="name" type="text" />
      </label>

      <SanitizePreview :initial="bio" @save="saveBio" @load="loadMe" />

      <p v-if="msg" class="msg">{{ msg }}</p>

      <button class="logout" @click="logout">Logout</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import SanitizePreview from "../components/SanitizePreview.vue";

const router = useRouter();
const loading = ref(true);
const msg = ref("");

const user = ref<{
  email: string;
  name?: string | null;
  bio?: string | null;
} | null>(null);
const name = ref("");
const bio = ref("");

const loadMe = async () => {
  msg.value = "";
  loading.value = true;

  const r = await fetch("/api/me", { credentials: "include" });
  if (!r.ok) {
    loading.value = false;
    router.push("/login");
    return;
  }

  const data = await r.json();
  user.value = data.user;
  name.value = data.user?.name ?? "";
  bio.value = data.user?.bio ?? "";

  loading.value = false;
};

const saveBio = async (rawBio: string) => {
  msg.value = "";

  const r = await fetch("/api/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: name.value, bio: rawBio }),
  });

  if (!r.ok) {
    msg.value = "Save failed";
    return;
  }

  msg.value = "Saved ✅";
  await loadMe(); // reload what server stored (server-side sanitize proof)
};

const logout = async () => {
  await fetch("/logout", { method: "POST", credentials: "include" });
  router.push("/login");
};

onMounted(loadMe);
</script>

<style scoped>
.row {
  display: grid;
  gap: 6px;
  max-width: 420px;
  margin: 10px 0;
}
input {
  padding: 8px;
}
.msg {
  margin-top: 10px;
}
.logout {
  margin-top: 14px;
  padding: 8px 12px;
}
</style>
