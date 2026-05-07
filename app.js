"use strict";

const boot = document.getElementById("boot");
const bootCopy = document.getElementById("bootCopy");
const bootOptions = document.getElementById("bootOptions");
const showSystems = document.getElementById("showSystems");
const maxios = document.getElementById("maxios");
const minios = document.getElementById("minios");
const desktopClock = document.getElementById("desktopClock");
const phoneClock = document.getElementById("phoneClock");
const windowLayer = document.getElementById("windowLayer");
const phoneScreen = document.getElementById("phoneScreen");
const phoneAppTitle = document.getElementById("phoneAppTitle");
const phoneContent = document.getElementById("phoneContent");
const closePhoneApp = document.getElementById("closePhoneApp");
const homeIndicator = document.getElementById("homeIndicator");
const appearanceMenuButton = document.getElementById("appearanceMenuButton");
const appearanceMenu = document.getElementById("appearanceMenu");
const statsMenuButton = document.getElementById("statsMenuButton");
const statsMenu = document.getElementById("statsMenu");

const appTitles = {
  music: "Musik",
  mail: "Mail",
  flappy: "Flappy Bird",
  settings: "Einstellung"
};

const appPositions = {
  music: { x: 306, y: 156 },
  mail: { x: 260, y: 96 },
  flappy: { x: 336, y: 128 }
};

let autoStart = true;
let topZ = 10;

const formspreeEndpoint = "https://formspree.io/f/xvzdlego";
const supabaseUrl = "https://ubjthqzvxzqmqiqxdxog.supabase.co";
const supabaseKey = "sb_publishable_2b1qOP4_bp0wsNcWPvY5gA_GnH8bw5m";
const statsLikeSlug = "home";

let supabaseClient = null;
let statsStarted = false;

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function typeBoot() {
  if (!bootCopy) return;

  const recommended = window.matchMedia("(max-width: 820px)").matches ? "miniOS" : "MaxiOS";
  const lines = [
    "T-Maxi",
    "",
    "System wird erkannt...",
    `${recommended} ausgewaehlt`,
    "Start wird vorbereitet..."
  ];

  let output = "";

  for (const line of lines) {
    for (const character of line) {
      output += character;
      bootCopy.textContent = output;
      await wait(22);
    }

    output += "\n";
    bootCopy.textContent = output;
    await wait(line ? 180 : 90);
  }
}

function startSystem(systemName) {
  autoStart = false;
  boot.classList.add("is-finished");
  boot.style.pointerEvents = "none";

  const useMini = systemName === "minios" || (
    !systemName && window.matchMedia("(max-width: 820px)").matches
  );

  maxios.hidden = useMini;
  maxios.style.display = useMini ? "none" : "block";
  minios.hidden = !useMini;
  minios.style.display = useMini ? "grid" : "none";

  window.setTimeout(() => {
    boot.hidden = true;
    boot.style.display = "none";
  }, 260);

  if (!useMini) return;
}

function showBootOptions() {
  autoStart = false;
  bootOptions.hidden = false;
  bootOptions.classList.add("is-visible");
}

window.startSystem = startSystem;
window.showBootOptions = showBootOptions;

function getSavedTheme() {
  return localStorage.getItem("siteTheme") === "light" ? "light" : "dark";
}

function applyTheme(theme) {
  const normalizedTheme = theme === "light" ? "light" : "dark";
  const isLight = normalizedTheme === "light";

  document.documentElement.classList.toggle("theme-light", isLight);
  localStorage.setItem("siteTheme", normalizedTheme);

  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    const isActive = button.dataset.themeOption === normalizedTheme;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

}

function setupTopbarMenus() {
  setupTopbarMenu(appearanceMenuButton, appearanceMenu);
  setupTopbarMenu(statsMenuButton, statsMenu);

  statsMenuButton?.addEventListener("click", () => {
    updateStats();
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".topbar-menu")) return;

    closeTopbarMenu(appearanceMenuButton, appearanceMenu);
    closeTopbarMenu(statsMenuButton, statsMenu);
  });
}

function setupTopbarMenu(button, menu) {
  button?.addEventListener("click", () => {
    const shouldOpen = menu?.hidden;

    closeTopbarMenu(appearanceMenuButton, appearanceMenu);
    closeTopbarMenu(statsMenuButton, statsMenu);

    menu.hidden = !shouldOpen;
    button.setAttribute("aria-expanded", String(shouldOpen));
  });
}

function closeTopbarMenu(button, menu) {
  if (!button || !menu) return;

  menu.hidden = true;
  button.setAttribute("aria-expanded", "false");
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId() {
  let sessionId = sessionStorage.getItem("siteSessionId");

  if (!sessionId) {
    sessionId = createId();
    sessionStorage.setItem("siteSessionId", sessionId);
  }

  return sessionId;
}

function getVisitorId() {
  let visitorId = sessionStorage.getItem("activeVisitorId");

  if (!visitorId) {
    visitorId = createId();
    sessionStorage.setItem("activeVisitorId", visitorId);
  }

  return visitorId;
}

function loadSupabaseScript() {
  if (window.supabase) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-supabase-script="true"]');

    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");

    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.defer = true;
    script.dataset.supabaseScript = "true";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });

    document.head.appendChild(script);
  });
}

async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  await loadSupabaseScript();

  if (!window.supabase) return null;

  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

  return supabaseClient;
}

function updateStatElements(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = String(value);
  });
}

async function recordPageView(client) {
  if (sessionStorage.getItem("pageViewRecorded") === "true") return;

  await client.from("site_pageviews").insert({
    page: window.location.pathname,
    session_id: getSessionId()
  });

  sessionStorage.setItem("pageViewRecorded", "true");
}

async function loadPageViews(client) {
  const { count, error } = await client
    .from("site_pageviews")
    .select("*", {
      count: "exact",
      head: true
    });

  if (error) throw error;

  return count || 0;
}

async function loadLikes(client) {
  const { data, error } = await client
    .from("site_likes")
    .select("like_count")
    .eq("slug", statsLikeSlug)
    .single();

  if (error) throw error;

  return data?.like_count || 0;
}

async function loadActiveVisitors(client) {
  await client.from("site_active_visitors").upsert({
    visitor_id: getVisitorId(),
    last_seen_at: new Date().toISOString()
  });

  const activeSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { count, error } = await client
    .from("site_active_visitors")
    .select("*", {
      count: "exact",
      head: true
    })
    .gte("last_seen_at", activeSince);

  if (error) throw error;

  return count || 0;
}

async function updateStats() {
  try {
    const client = await getSupabaseClient();

    if (!client) throw new Error("Supabase nicht verfuegbar.");

    await recordPageView(client);

    const [pageViews, activeVisitors, likes] = await Promise.all([
      loadPageViews(client),
      loadActiveVisitors(client),
      loadLikes(client)
    ]);

    updateStatElements("[data-stats-pageviews]", pageViews);
    updateStatElements("[data-stats-active]", activeVisitors);
    updateStatElements("[data-stats-likes]", likes);
    updateStatElements(
      "[data-stats-updated]",
      `Aktualisiert: ${new Date().toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit"
      })}`
    );
  } catch (error) {
    console.warn("Statistiken konnten nicht geladen werden:", error);

    updateStatElements("[data-stats-pageviews]", "–");
    updateStatElements("[data-stats-active]", "–");
    updateStatElements("[data-stats-likes]", "–");
    updateStatElements("[data-stats-updated]", "Gerade nicht verfuegbar.");
  }
}

function startStats() {
  if (statsStarted) return;

  statsStarted = true;
  updateStats();
  window.setInterval(updateStats, 60000);
}

function updateClocks() {
  const now = new Date();

  if (desktopClock) {
    const weekday = now.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
    const date = now.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    const time = now.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    desktopClock.textContent = `${weekday}. ${date} | ${time}`;
  }

  if (phoneClock) {
    phoneClock.textContent = now.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

function getTemplate(appKey) {
  return document.getElementById(`app-${appKey}`);
}

function bringToFront(windowElement) {
  topZ += 1;
  windowElement.style.zIndex = String(topZ);
}

function openWindow(appKey) {
  if (!windowLayer) return;

  const existing = windowLayer.querySelector(`[data-window="${appKey}"]`);

  if (existing) {
    bringToFront(existing);
    return;
  }

  const template = getTemplate(appKey);
  const position = appPositions[appKey] || { x: 220, y: 96 };
  const windowElement = document.createElement("article");

  windowElement.className = "window";
  windowElement.dataset.window = appKey;
  windowElement.style.left = `${position.x}px`;
  windowElement.style.top = `${position.y}px`;

  if (appKey === "mail") {
    windowElement.classList.add("mail-window");
  }

  if (appKey === "music") {
    windowElement.classList.add("music-window");
  }

  if (appKey === "flappy") {
    windowElement.classList.add("flappy-window");
  }

  windowElement.innerHTML = `
    <div class="window-bar">
      <div class="window-controls">
        <button class="window-control window-close" type="button" aria-label="Fenster schliessen"></button>
        <button class="window-control window-minimize" type="button" aria-label="Fenster minimieren"></button>
        <button class="window-control window-zoom" type="button" aria-label="Fenster nach vorne holen"></button>
      </div>
      <strong class="window-title">${appTitles[appKey]}</strong>
      <span></span>
    </div>
    <div class="window-body"></div>
    <button class="window-resize" type="button" aria-label="Fenstergroesse aendern"></button>
  `;

  const body = windowElement.querySelector(".window-body");
  body.appendChild(template.content.cloneNode(true));

  windowLayer.appendChild(windowElement);
  clampWindowToViewport(windowElement);
  bringToFront(windowElement);
  makeWindowDraggable(windowElement);
  makeWindowResizable(windowElement);

  if (appKey === "mail") {
    setupMailForm(windowElement);
  }

  if (appKey === "flappy") {
    setupFlappyGame(windowElement);
  }

  windowElement.querySelector(".window-close").addEventListener("click", () => {
    windowElement.remove();
  });

  windowElement.querySelector(".window-minimize").addEventListener("click", () => {
    windowElement.style.display = "none";
    window.setTimeout(() => {
      windowElement.style.display = "";
      bringToFront(windowElement);
    }, 520);
  });

  windowElement.querySelector(".window-zoom").addEventListener("click", () => {
    bringToFront(windowElement);
  });

  windowElement.addEventListener("pointerdown", () => {
    bringToFront(windowElement);
  });
}

function clampWindowToViewport(windowElement) {
  const maxLeft = window.innerWidth - windowElement.offsetWidth - 12;
  const maxTop = window.innerHeight - windowElement.offsetHeight - 12;
  const nextLeft = Math.max(12, Math.min(windowElement.offsetLeft, maxLeft));
  const nextTop = Math.max(12, Math.min(windowElement.offsetTop, maxTop));

  windowElement.style.left = `${nextLeft}px`;
  windowElement.style.top = `${nextTop}px`;
}

function makeWindowDraggable(windowElement) {
  const handle = windowElement.querySelector(".window-bar");

  if (!handle) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  handle.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;

    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    initialLeft = windowElement.offsetLeft;
    initialTop = windowElement.offsetTop;

    bringToFront(windowElement);
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!isDragging) return;

    const nextLeft = initialLeft + event.clientX - startX;
    const nextTop = initialTop + event.clientY - startY;
    const maxLeft = window.innerWidth - windowElement.offsetWidth - 12;
    const maxTop = window.innerHeight - windowElement.offsetHeight - 12;

    windowElement.style.left = `${Math.max(12, Math.min(nextLeft, maxLeft))}px`;
    windowElement.style.top = `${Math.max(12, Math.min(nextTop, maxTop))}px`;
  });

  handle.addEventListener("pointerup", (event) => {
    isDragging = false;
    handle.releasePointerCapture(event.pointerId);
  });

  handle.addEventListener("pointercancel", () => {
    isDragging = false;
  });

  handle.addEventListener("mousedown", (event) => {
    if (event.target.closest("button")) return;

    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    initialLeft = windowElement.offsetLeft;
    initialTop = windowElement.offsetTop;

    bringToFront(windowElement);
  });

  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;

    const nextLeft = initialLeft + event.clientX - startX;
    const nextTop = initialTop + event.clientY - startY;
    const maxLeft = window.innerWidth - windowElement.offsetWidth - 12;
    const maxTop = window.innerHeight - windowElement.offsetHeight - 12;

    windowElement.style.left = `${Math.max(12, Math.min(nextLeft, maxLeft))}px`;
    windowElement.style.top = `${Math.max(12, Math.min(nextTop, maxTop))}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

function makeWindowResizable(windowElement) {
  const handle = windowElement.querySelector(".window-resize");

  if (!handle) return;

  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let initialWidth = 0;
  let initialHeight = 0;

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();

    isResizing = true;
    startX = event.clientX;
    startY = event.clientY;
    initialWidth = windowElement.offsetWidth;
    initialHeight = windowElement.offsetHeight;

    bringToFront(windowElement);
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!isResizing) return;

    const minWidth = windowElement.classList.contains("mail-window") ? 520 : 460;
    const minHeight = windowElement.classList.contains("mail-window") ? 440 : 430;
    const maxWidth = window.innerWidth - windowElement.offsetLeft - 12;
    const maxHeight = window.innerHeight - windowElement.offsetTop - 12;
    const nextWidth = initialWidth + event.clientX - startX;
    const nextHeight = initialHeight + event.clientY - startY;

    windowElement.style.width = `${Math.max(minWidth, Math.min(nextWidth, maxWidth))}px`;
    windowElement.style.height = `${Math.max(minHeight, Math.min(nextHeight, maxHeight))}px`;
  });

  handle.addEventListener("pointerup", (event) => {
    isResizing = false;
    handle.releasePointerCapture(event.pointerId);
  });

  handle.addEventListener("pointercancel", () => {
    isResizing = false;
  });

  handle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();

    isResizing = true;
    startX = event.clientX;
    startY = event.clientY;
    initialWidth = windowElement.offsetWidth;
    initialHeight = windowElement.offsetHeight;

    bringToFront(windowElement);
  });

  document.addEventListener("mousemove", (event) => {
    if (!isResizing) return;

    resizeWindowToPointer(windowElement, {
      initialWidth,
      initialHeight,
      startX,
      startY,
      clientX: event.clientX,
      clientY: event.clientY
    });
  });

  document.addEventListener("mouseup", () => {
    isResizing = false;
  });
}

function resizeWindowToPointer(windowElement, pointer) {
  const minWidth = windowElement.classList.contains("mail-window") ? 520 : 460;
  const minHeight = windowElement.classList.contains("mail-window") ? 440 : 430;
  const maxWidth = window.innerWidth - windowElement.offsetLeft - 12;
  const maxHeight = window.innerHeight - windowElement.offsetTop - 12;
  const nextWidth = pointer.initialWidth + pointer.clientX - pointer.startX;
  const nextHeight = pointer.initialHeight + pointer.clientY - pointer.startY;

  windowElement.style.width = `${Math.max(minWidth, Math.min(nextWidth, maxWidth))}px`;
  windowElement.style.height = `${Math.max(minHeight, Math.min(nextHeight, maxHeight))}px`;
}

function openPhoneApp(appKey) {
  const template = getTemplate(appKey);

  if (!template || !phoneScreen || !phoneAppTitle || !phoneContent) return;

  phoneAppTitle.textContent = appTitles[appKey];
  phoneContent.replaceChildren(template.content.cloneNode(true));
  phoneScreen.classList.add("is-open");
  phoneScreen.setAttribute("aria-hidden", "false");

  if (appKey === "mail") {
    setupMailForm(phoneScreen);
  }

  if (appKey === "flappy") {
    setupFlappyGame(phoneScreen);
  }

  if (appKey === "settings") {
    setupSettingsApp(phoneScreen);
  }
}

function closePhoneScreen() {
  if (!phoneScreen) return;

  phoneScreen.classList.remove("is-open");
  phoneScreen.setAttribute("aria-hidden", "true");
}

function setupSettingsApp(scope) {
  scope.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.themeOption);
    });
  });

  applyTheme(getSavedTheme());
  updateStats();
}

function setupFlappyGame(scope) {
  const root = scope.querySelector("[data-flappy-game]");
  const canvas = scope.querySelector("[data-flappy-canvas]");
  const scoreElement = scope.querySelector("[data-flappy-score]");
  const bestElement = scope.querySelector("[data-flappy-best]");

  if (!root || !canvas || !scoreElement || !bestElement) return;
  if (root.dataset.ready === "true") return;

  root.dataset.ready = "true";

  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const groundHeight = 76;
  const bird = {
    x: 96,
    y: height * 0.42,
    radius: 16,
    velocity: 0
  };

  let pipes = [];
  let score = 0;
  let best = Number(localStorage.getItem("flappyBest") || 0);
  let frame = 0;
  let state = "ready";
  let animationFrame = null;

  bestElement.textContent = String(best);

  function resetGame() {
    pipes = [];
    score = 0;
    frame = 0;
    bird.y = height * 0.42;
    bird.velocity = 0;
    scoreElement.textContent = "0";
  }

  function flap() {
    if (state !== "playing") {
      resetGame();
      state = "playing";
      bird.velocity = -8.6;
      startLoop();
      return;
    }

    bird.velocity = -8.6;
  }

  function endGame() {
    state = "ended";

    if (score > best) {
      best = score;
      localStorage.setItem("flappyBest", String(best));
      bestElement.textContent = String(best);
    }
  }

  function spawnPipe() {
    const gap = 144;
    const topMin = 58;
    const topMax = height - groundHeight - gap - 84;
    const topHeight = Math.floor(topMin + Math.random() * (topMax - topMin));

    pipes.push({
      x: width + 28,
      width: 62,
      topHeight,
      bottomY: topHeight + gap,
      passed: false
    });
  }

  function updateGame() {
    frame += 1;
    bird.velocity += 0.46;
    bird.y += bird.velocity;

    if (frame === 1 || frame % 92 === 0) {
      spawnPipe();
    }

    pipes.forEach((pipe) => {
      pipe.x -= 2.8;

      if (!pipe.passed && pipe.x + pipe.width < bird.x) {
        pipe.passed = true;
        score += 1;
        scoreElement.textContent = String(score);
      }
    });

    pipes = pipes.filter((pipe) => pipe.x + pipe.width > -20);

    const hitGround = bird.y + bird.radius >= height - groundHeight;
    const hitCeiling = bird.y - bird.radius <= 0;
    const hitPipe = pipes.some((pipe) => {
      const overlapsX =
        bird.x + bird.radius > pipe.x &&
        bird.x - bird.radius < pipe.x + pipe.width;
      const outsideGap =
        bird.y - bird.radius < pipe.topHeight ||
        bird.y + bird.radius > pipe.bottomY;

      return overlapsX && outsideGap;
    });

    if (hitGround || hitCeiling || hitPipe) {
      endGame();
    }
  }

  function drawBackground() {
    const gradient = context.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0, "#86d8ef");
    gradient.addColorStop(0.58, "#c4edf4");
    gradient.addColorStop(1, "#f1d796");

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255, 255, 255, 0.48)";
    drawCloud(70, 82, 34);
    drawCloud(300, 142, 28);
  }

  function drawCloud(x, y, size) {
    context.beginPath();
    context.arc(x, y, size * 0.55, Math.PI, 0);
    context.arc(x + size * 0.45, y - size * 0.22, size * 0.58, Math.PI, 0);
    context.arc(x + size, y, size * 0.5, Math.PI, 0);
    context.rect(x - size * 0.55, y, size * 1.55, size * 0.45);
    context.fill();
  }

  function drawPipes() {
    pipes.forEach((pipe) => {
      const bottomHeight = height - groundHeight - pipe.bottomY;

      drawPipe(pipe.x, 0, pipe.width, pipe.topHeight, true);
      drawPipe(pipe.x, pipe.bottomY, pipe.width, bottomHeight, false);
    });
  }

  function drawPipe(x, y, pipeWidth, pipeHeight, isTop) {
    const capHeight = 18;

    context.fillStyle = "#5bbf68";
    context.fillRect(x, y, pipeWidth, pipeHeight);
    context.fillStyle = "#7ee080";
    context.fillRect(x + 7, y, 10, pipeHeight);
    context.fillStyle = "#3f9f50";

    if (isTop) {
      context.fillRect(x - 5, y + pipeHeight - capHeight, pipeWidth + 10, capHeight);
      return;
    }

    context.fillRect(x - 5, y, pipeWidth + 10, capHeight);
  }

  function drawBird() {
    context.save();
    context.translate(bird.x, bird.y);
    context.rotate(Math.max(-0.45, Math.min(0.7, bird.velocity * 0.055)));

    context.fillStyle = "#ffd75f";
    context.beginPath();
    context.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ff9f43";
    context.beginPath();
    context.ellipse(-7, 4, 10, 7, -0.4, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(8, -6, 5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#111";
    context.beginPath();
    context.arc(10, -6, 2, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#f47c3c";
    context.beginPath();
    context.moveTo(16, 0);
    context.lineTo(30, 5);
    context.lineTo(16, 10);
    context.closePath();
    context.fill();

    context.restore();
  }

  function drawGround() {
    context.fillStyle = "#dfb86f";
    context.fillRect(0, height - groundHeight, width, groundHeight);
    context.fillStyle = "#91d06f";
    context.fillRect(0, height - groundHeight, width, 16);

    for (let x = -((frame * 2) % 28); x < width; x += 28) {
      context.fillStyle = "rgba(120, 84, 42, 0.26)";
      context.fillRect(x, height - groundHeight + 28, 14, 5);
    }
  }

  function drawOverlay() {
    if (state === "playing") return;

    context.fillStyle = "rgba(7, 16, 24, 0.48)";
    context.fillRect(0, 0, width, height);

    context.fillStyle = "#f4f1ea";
    context.font = "800 28px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(state === "ended" ? "Game Over" : "Flappy Bird", width / 2, 228);

    context.font = "700 15px Inter, system-ui, sans-serif";
    context.fillText(
      state === "ended" ? "Tippe fuer eine neue Runde." : "Tippe zum Starten.",
      width / 2,
      258
    );
  }

  function drawGame() {
    context.clearRect(0, 0, width, height);
    drawBackground();
    drawPipes();
    drawGround();
    drawBird();
    drawOverlay();
  }

  function tick() {
    if (state === "playing") {
      updateGame();
    }

    drawGame();

    if (state === "playing") {
      animationFrame = window.requestAnimationFrame(tick);
    }
  }

  function startLoop() {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
    }

    tick();
  }

  root.flap = flap;
  canvas.addEventListener("pointerdown", flap);

  drawGame();
}

function setupMailForm(scope) {
  const form = scope.querySelector("#mailForm");
  const status = scope.querySelector("[data-mail-status]");
  const submitButton = scope.querySelector('button[type="submit"]');
  const turnstileElement = scope.querySelector("[data-turnstile]");

  if (!form || !status || !submitButton) return;

  renderTurnstile(turnstileElement);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const turnstileToken = String(formData.get("cf-turnstile-response") || "").trim();

    if (!name || !email || !message) {
      status.textContent = "Bitte fuelle Name, E-Mail und Nachricht aus.";
      return;
    }

    if (!turnstileToken) {
      status.textContent = "Bitte bestaetige kurz die Sicherheitspruefung.";
      return;
    }

    status.textContent = "Wird gesendet...";
    submitButton.disabled = true;

    try {
      const response = await fetch(formspreeEndpoint, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json"
        }
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const formspreeError =
          result?.errors?.[0]?.message ||
          result?.error ||
          "Formspree hat die Nachricht abgelehnt.";

        throw new Error(formspreeError);
      }

      form.reset();
      resetTurnstile(turnstileElement);
      status.textContent = "Nachricht gesendet. Danke!";
    } catch (error) {
      console.error("Mail konnte nicht gesendet werden:", error);
      status.textContent = error.message || "Nachricht konnte nicht gesendet werden.";
    } finally {
      submitButton.disabled = false;
    }
  });
}

function renderTurnstile(turnstileElement) {
  if (!turnstileElement) return;

  if (window.location.protocol === "file:") {
    turnstileElement.textContent =
      "Sicherheitspruefung ist auf der Live-Domain aktiv.";
    return;
  }

  loadTurnstileScript();

  const render = () => {
    if (!window.turnstile || turnstileElement.dataset.rendered === "true") return;

    window.turnstile.render(turnstileElement, {
      sitekey: turnstileElement.dataset.sitekey
    });

    turnstileElement.dataset.rendered = "true";
  };

  render();
  window.setTimeout(render, 350);
  window.setTimeout(render, 1000);
}

function loadTurnstileScript() {
  if (document.querySelector('script[data-turnstile-script="true"]')) return;

  const script = document.createElement("script");

  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
  script.async = true;
  script.defer = true;
  script.dataset.turnstileScript = "true";

  document.head.appendChild(script);
}

function resetTurnstile(turnstileElement) {
  if (!turnstileElement || !window.turnstile) return;

  window.turnstile.reset(turnstileElement);
}

showSystems?.addEventListener("click", showBootOptions);

document.querySelectorAll("[data-start-system]").forEach((button) => {
  button.addEventListener("click", () => {
    startSystem(button.dataset.startSystem);
  });
});

document.querySelectorAll("[data-open-app]").forEach((button) => {
  button.addEventListener("click", () => {
    openWindow(button.dataset.openApp);
  });
});

document.querySelectorAll("[data-open-phone-app]").forEach((button) => {
  button.addEventListener("click", () => {
    openPhoneApp(button.dataset.openPhoneApp);
  });
});

document.querySelectorAll("[data-theme-option]").forEach((button) => {
  button.addEventListener("click", () => {
    applyTheme(button.dataset.themeOption);

    if (appearanceMenu && button.closest("#appearanceMenu")) {
      appearanceMenu.hidden = true;
      appearanceMenuButton?.setAttribute("aria-expanded", "false");
    }
  });
});

closePhoneApp?.addEventListener("click", closePhoneScreen);
homeIndicator?.addEventListener("click", closePhoneScreen);

document.addEventListener("keydown", (event) => {
  if (!boot.hidden && event.key === "1") startSystem("maxios");
  if (!boot.hidden && event.key === "2") startSystem("minios");
  if (!boot.hidden && event.key === "Escape") showBootOptions();
  if (event.key === "Escape") closePhoneScreen();

  if (event.code === "Space") {
    const activeGame = document.querySelector('[data-flappy-game][data-ready="true"]');

    if (activeGame?.flap && activeGame.offsetParent !== null) {
      event.preventDefault();
      activeGame.flap();
    }
  }
});

typeBoot();
setupTopbarMenus();
applyTheme(getSavedTheme());
startStats();

window.setTimeout(() => {
  if (autoStart) startSystem();
}, 3000);

updateClocks();
window.setInterval(updateClocks, 1000);

window.addEventListener("resize", () => {
  document.querySelectorAll(".window").forEach((windowElement) => {
    clampWindowToViewport(windowElement);
  });
});
