// DOM Helper
const $ = (id) => document.getElementById(id);

// HTML 특수기호 변환
function escapeHTML(str) {
  return (
    str?.replace(
      /[&<>'"]/g,
      (tag) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[tag],
    ) || ""
  );
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 토스트 팝업 렌더러
function showToast(message) {
  const container = $("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
  <i class="material-symbols-outlined">spa</i>
  <span>${message}</span>
`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3000);
}
