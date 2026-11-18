<!-- components/AppLoader.vue -->
<template>
  <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-md text-left">
    <div class="bg-white p-8 rounded-[32px] shadow-2xl border border-gray-100 flex flex-col items-center space-y-4 max-w-xs w-full mx-4 animate-fade-in">
      
      <!-- Animated Logo Icon -->
      <div class="relative w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
        <div class="absolute inset-0 rounded-2xl border-2 border-indigo-400 animate-ping opacity-25"></div>
        <span class="text-white text-2xl font-black tracking-tighter">Ai</span>
      </div>

      <div class="text-center space-y-1">
        <h2 class="text-sm font-black text-gray-900 uppercase tracking-wider">Aika Dispatch</h2>
        <p class="text-xs text-gray-400 font-semibold animate-pulse">Establishing secure handshake...</p>
      </div>

      <!-- Progress bar simulation -->
      <div class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
        <div class="bg-indigo-600 h-full rounded-full animate-indeterminate"></div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes indeterminate {
  0% { transform: translateX(-100%); width: 30%; }
  50% { transform: translateX(50%); width: 50%; }
  100% { transform: translateX(100%); width: 30%; }
}
.animate-indeterminate {
  animation: indeterminate 1.5s infinite linear;
}
</style>