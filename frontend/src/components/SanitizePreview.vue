<template>
  <div class="wrap">
    <h2>XSS-sanitizer (watcher-demo)</h2>

    <label class="label">
      Skriv tekst/HTML:
      <textarea v-model="raw" rows="6" class="ta"></textarea>
    </label>

    <div class="grid">
      <div class="box">
        <h3>Original input</h3>
        <pre class="pre">{{ raw }}</pre>
      </div>

      <div class="box">
        <h3>Saniteret output</h3>
        <pre class="pre">{{ sanitized }}</pre>

        <h4>Saniteret visning</h4>
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

const raw = ref("");
const sanitized = ref("");

function sanitize(input: string): string {
  let s = input;

  // 1) Fjern script tag (case-insensitive, inkl. newlines)
  s = s.replace(/<\u0073cript\b[^>]*>[\s\S]*?<\/\u0073cript>/gi, "");

  // 2) Fjern inline event handlers: onerror=..., onclick=..., onload=...
  //    dækker: onx="..." | onx='...' | onx=udenAnførsel
  s = s.replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");

  s = s.replace(
    /\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi,
    ' $1="#"',
  );

  return s;
}

watch(
  raw,
  (val) => {
    sanitized.value = sanitize(val);
  },
  { immediate: true },
);
</script>

<style scoped>
.wrap {
  max-width: 1000px;
  margin: 24px auto;
  padding: 0 16px;
  font-family: system-ui, sans-serif;
}
.label {
  display: block;
  margin-bottom: 12px;
}
.ta {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
  white-space: pre-wrap;
  word-break: break-word;
}
.safe {
  border: 1px dashed #0a0;
  padding: 8px;
  border-radius: 6px;
  min-height: 42px;
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
