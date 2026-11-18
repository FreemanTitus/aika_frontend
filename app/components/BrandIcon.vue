<template>
  <svg
    role="img"
    :viewBox="viewBox"
    :width="size"
    :height="size"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path :d="path" />
  </svg>
</template>

<script setup>
defineProps({
  path: {
    type: String,
    required: true
  },
  viewBox: {
    type: String,
    default: '0 0 24 24'
  },
  size: {
    type: [String, Number],
    default: 24
  }
})
</script>