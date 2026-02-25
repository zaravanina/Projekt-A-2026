<template>
  <div>
    <h2>Check your email</h2>
    <p>
      We sent you a one-time login link. It expires soon and can only be used
      once.
    </p>
    <p>
      <b>Dev tip:</b> if mail isn’t configured, the link is printed in the
      backend console.
    </p>

    <p style="margin-top: 12px">
      After clicking the link, go to
      <RouterLink to="/dashboard">Dashboard</RouterLink>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>
