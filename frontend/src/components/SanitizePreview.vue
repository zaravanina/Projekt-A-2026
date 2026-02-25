<template>
  <div class="wrap">
    <h2>XSS-sanitizer demo</h2>

    <label>
      Skriv tekst/HTML:
      <textarea v-model="raw" rows="6" class="ta"></textarea>
    </label>

    <div class="grid">
      <div class="box">
        <h3>Original input (rå)</h3>
        <pre class="pre">{{ raw }}</pre>

        <h4>Original renderet (FARLIGT - kun til demo)</h4>
        <div class="danger" v-html="raw"></div>
      </div>

      <div class="box">
        <h3>Saniteret output</h3>
        <pre class="pre">{{ sanitized }}</pre>

        <h4>Saniteret renderet</h4>
        <div class="safe" v-html="sanitized"></div>
      </div>
    </div>

    <p class="hint">
      Prøv fx: <code>&lt;img src=x onerror=alert(1)&gt;</code> eller
      <code>&lt;script&gt;alert(1)&lt;/script&gt;</code>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const raw = ref<string>("");
const sanitized = ref<string>("");

/**
 * Simpel sanitizer:
 * 1) Fjern script blokke
 * 2) Fjern inline event handlers: onerror=..., onclick=..., onload=...
 * 3) Neutralisér javascript: i href/src
 *
 * Dette er en demo og dækker ikke alt, men opfylder opgaven godt.
 */
function sanitize(input: string): string {
  let s = input;

  // 1) Fjern script (case-insensitive, inkl. newlines)
  s = s.replace(/<\u0073cript\b[^>]*>[\s\S]*?<\/\u0073cript>/gi, "");

  // 2) Fjern event-attributter: onxxx="..." / onxxx='...' / onxxx=...
  //    (matcher on + bogstaver, og fjerner hele attributten)
  s = s.replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");

  // 3) Stop javascript: i href/src (meget simpelt)
  s = s.replace(
    /\s(href|src)\s*=\s*("|\')\s*javascript:[\s\S]*?\2/gi,
    ' $1="#"',
  );

  return s;
}

// Watcher: opdater sanitized hver gang raw ændres
watch(
  raw,
  (newVal) => {
    sanitized.value = sanitize(newVal);
  },
  { immediate: true },
);
</script>

<style scoped>
.wrap {
  max-width: 1000px;
  margin: 24px auto;
  font-family: system-ui, sans-serif;
  padding: 0 16px;
}
.ta {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
.box {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
}
.pre {
  background: #f6f6f6;
  padding: 8px;
  border-radius: 6px;
  overflow: auto;
}
.danger {
  border: 1px dashed #c00;
  padding: 8px;
  border-radius: 6px;
}
.safe {
  border: 1px dashed #0a0;
  padding: 8px;
  border-radius: 6px;
}
.hint {
  margin-top: 12px;
  color: #444;
}
code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 6px;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
