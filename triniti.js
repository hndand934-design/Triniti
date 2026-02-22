(() => {
  const tgBtn = document.getElementById("tgBtn");
  const vkBtn = document.getElementById("vkBtn");

  // пока заглушки — просто показываем alert
  tgBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Telegram кнопка (пока заглушка).");
  });

  vkBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("VK кнопка (пока заглушка).");
  });
})();
