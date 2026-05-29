// ─── 물 흐르듯 흐르는 황혼 시계 ───
function startContinuousClock() {
  function updateClock() {
    const now = new Date();
    $("digital-clock").textContent = now.toTimeString().split(" ")[0];

    const ms = now.getMilliseconds();
    const seconds = now.getSeconds() + ms / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    $("sec-hand").style.transform = `rotate(${seconds * 6}deg)`;
    $("min-hand").style.transform = `rotate(${minutes * 6}deg)`;
    $("hour-hand").style.transform = `rotate(${hours * 30}deg)`;

    requestAnimationFrame(updateClock);
  }
  requestAnimationFrame(updateClock);
}
