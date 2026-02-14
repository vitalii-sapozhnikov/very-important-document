const noBtn = document.getElementById("noBtn");
const yesBtn = document.getElementById("yesBtn");
const buttonArea = document.getElementById("buttonArea");
const celebration = document.getElementById("celebration");
const promptCard = document.getElementById("promptCard");
const nudgeText = document.getElementById("nudgeText");
const fireworksCanvas = document.getElementById("fireworks");
const ctx = fireworksCanvas.getContext("2d");
const photoCards = Array.from(document.querySelectorAll(".photo-card"));
const galleryModal = document.getElementById("galleryModal");
const galleryImage = document.getElementById("galleryImage");
const galleryTitle = document.getElementById("galleryTitle");
const galleryDescription = document.getElementById("galleryDescription");
const galleryPrev = document.getElementById("galleryPrev");
const galleryNext = document.getElementById("galleryNext");
const galleryClose = document.getElementById("galleryClose");
const celebrationSound = document.getElementById("celebrationSound");
const bonusBtn = document.getElementById("bonusBtn");
const bonusModal = document.getElementById("bonusModal");
const bonusClose = document.getElementById("bonusClose");
const bonusVideo = document.getElementById("bonusVideo");

const particles = [];
let animationFrameId = null;
let lastFirework = 0;
let noHoverCount = 0;
let lastNudgeIndex = -1;
let celebrationEndTime = 0;
let isNoMoving = false;
let pointerX = null;
let pointerY = null;
let activePhotoIndex = 0;
let noBtnX = 24;
let noBtnY = 24;
let audioContext = null;

const colors = ["#ff4b92", "#ff6aa8", "#ffd166", "#ff9ecb", "#ffffff"];

const resizeCanvas = () => {
  fireworksCanvas.width = celebration.clientWidth;
  fireworksCanvas.height = celebration.clientHeight;
};

const randomBetween = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getAudioContext = () => {
  if (audioContext) return audioContext;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  audioContext = new AudioCtx();
  return audioContext;
};

const playHurrayFireworkSound = () => {
  const ctxAudio = getAudioContext();
  if (!ctxAudio) return;

  if (ctxAudio.state === "suspended") {
    ctxAudio.resume();
  }

  const now = ctxAudio.currentTime;
  const master = ctxAudio.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.24, now + 0.05);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);
  master.connect(ctxAudio.destination);

  const makeTone = (frequency, start, duration) => {
    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.6, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration);
  };

  makeTone(420, now + 0.02, 0.32);
  makeTone(530, now + 0.2, 0.34);
  makeTone(660, now + 0.42, 0.36);

  const burstTimes = [0.18, 0.5, 0.82, 1.1];
  burstTimes.forEach((offset) => {
    const sampleRate = ctxAudio.sampleRate;
    const length = Math.floor(sampleRate * 0.22);
    const buffer = ctxAudio.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const source = ctxAudio.createBufferSource();
    const filter = ctxAudio.createBiquadFilter();
    const gain = ctxAudio.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(randomBetween(900, 1800), now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.13, now + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now + offset);
    source.stop(now + offset + 0.23);
  });
};

const playCelebrationSound = () => {
  if (!celebrationSound) {
    playHurrayFireworkSound();
    return;
  }

  celebrationSound.currentTime = 0;
  celebrationSound.volume = 0.85;
  celebrationSound.play().catch(() => {
    playHurrayFireworkSound();
  });
};

const getNoButtonBounds = () => {
  const rect = noBtn.getBoundingClientRect();
  const cardRect = promptCard.getBoundingClientRect();
  const margin = 20;
  const viewportMargin = 12;
  const expandX = cardRect.width * 0.5;
  const expandY = cardRect.height * 0.5;

  const desiredMinX = -expandX + margin;
  const desiredMinY = -expandY + margin;
  const desiredMaxX = cardRect.width + expandX - rect.width - margin;
  const desiredMaxY = cardRect.height + expandY - rect.height - margin;

  const viewportMinX = viewportMargin - cardRect.left;
  const viewportMinY = viewportMargin - cardRect.top;
  const viewportMaxX =
    window.innerWidth - rect.width - viewportMargin - cardRect.left;
  const viewportMaxY =
    window.innerHeight - rect.height - viewportMargin - cardRect.top;

  const minX = Math.max(desiredMinX, viewportMinX);
  const minY = Math.max(desiredMinY, viewportMinY);
  const maxX = Math.min(desiredMaxX, viewportMaxX);
  const maxY = Math.min(desiredMaxY, viewportMaxY);

  return {
    minX,
    minY,
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
    width: rect.width,
    height: rect.height,
  };
};

const setNoButtonPosition = (x, y) => {
  const bounds = getNoButtonBounds();
  noBtnX = clamp(x, bounds.minX, bounds.maxX);
  noBtnY = clamp(y, bounds.minY, bounds.maxY);
  noBtn.style.transform = `translate(${noBtnX}px, ${noBtnY}px)`;
};

const launchFirework = () => {
  const x = fireworksCanvas.width / 2;
  const y = fireworksCanvas.height / 2;
  const count = Math.floor(randomBetween(80, 130));

  for (let i = 0; i < count; i += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(2.5, 7.5);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randomBetween(55, 100),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: randomBetween(3, 6),
    });
  }
};

const animateFireworks = (timestamp) => {
  if (timestamp > celebrationEndTime) {
    ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    animationFrameId = null;
    return;
  }
  if (!lastFirework) {
    lastFirework = timestamp;
  }

  if (timestamp - lastFirework > 600) {
    launchFirework();
    lastFirework = timestamp;
  }

  ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02;
    p.life -= 1;

    ctx.globalAlpha = Math.max(p.life / 80, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  ctx.globalAlpha = 1;
  animationFrameId = requestAnimationFrame(animateFireworks);
};

const moveNoButton = () => {
  if (isNoMoving) return;
  isNoMoving = true;
  noBtn.style.pointerEvents = "none";

  const bounds = getNoButtonBounds();

  const safeRadius = 140;
  const maxJumpDistance = 420;
  let nextX = 0;
  let nextY = 0;
  let attempts = 0;

  do {
    nextX = randomBetween(bounds.minX, bounds.maxX);
    nextY = randomBetween(bounds.minY, bounds.maxY);
    attempts += 1;
  } while (
    attempts < 30 &&
    ((pointerX !== null &&
      pointerY !== null &&
      Math.hypot(
        pointerX - (nextX + bounds.width / 2),
        pointerY - (nextY + bounds.height / 2)
      ) < safeRadius) ||
      Math.hypot(nextX - noBtnX, nextY - noBtnY) > maxJumpDistance)
  );

  setNoButtonPosition(nextX, nextY);

  window.setTimeout(() => {
    noBtn.style.pointerEvents = "auto";
    isNoMoving = false;
  }, 200);
};

const positionNoButtonNextToYes = () => {
  const yesRect = yesBtn.getBoundingClientRect();
  const cardRect = promptCard.getBoundingClientRect();
  const bounds = getNoButtonBounds();

  const rawX = yesRect.left - cardRect.left + yesRect.width + 18;
  const rawY = yesRect.top - cardRect.top + (yesRect.height - bounds.height) / 2;

  setNoButtonPosition(rawX, rawY);
};

const nudgeMessages = [
  "Ти ж знаєш, що «Так» звучить солодше ✨",
  "Ти ж знаєш, що я не здамся без твого «Так» 🥰",
  "Це наймиліша кнопка у всьому інтернеті — натисни «Так»",
  "Обіцяю: феєрверки вже чекають 🎆",
  "Підказка: «Так» відкриває галерею найкращих моментів",
  "Одне «Так» — і порція обіймів уже в дорозі 🫂",
  "Помилка 404: Кнопка «Ні» не працює в цей день ❤️",
  "Спробуй ще раз, я вірю в твоє серце!"
];

const showNudge = () => {
  if (!nudgeText) return;
  let nextIndex = Math.floor(Math.random() * nudgeMessages.length);
  if (nextIndex === lastNudgeIndex) {
    nextIndex = (nextIndex + 1) % nudgeMessages.length;
  }
  lastNudgeIndex = nextIndex;
  nudgeText.textContent = nudgeMessages[nextIndex];
  nudgeText.classList.remove("is-hidden");
};

const enableNoButtonDodge = () => {
  positionNoButtonNextToYes();
  promptCard.addEventListener("pointermove", (event) => {
    const cardRect = promptCard.getBoundingClientRect();
    pointerX = event.clientX - cardRect.left;
    pointerY = event.clientY - cardRect.top;
  });
  promptCard.addEventListener("pointerleave", () => {
    pointerX = null;
    pointerY = null;
  });
  noBtn.addEventListener("pointerenter", moveNoButton);
  noBtn.addEventListener("pointerdown", moveNoButton);
  noBtn.addEventListener("mouseover", moveNoButton);
  buttonArea.addEventListener("pointermove", (event) => {
    if (event.target === noBtn) {
      moveNoButton();
    }
  });

  const countNudge = () => {
    noHoverCount += 1;
    if (noHoverCount >= 3) {
      showNudge();
    }
  };

  noBtn.addEventListener("pointerenter", countNudge);
  noBtn.addEventListener("mouseover", countNudge);
};

const startCelebration = () => {
  playCelebrationSound();
  celebration.classList.remove("hidden");
  celebration.setAttribute("aria-hidden", "false");
  celebration.scrollTop = 0;
  promptCard.classList.add("hidden");
  if (nudgeText) {
    nudgeText.classList.add("is-hidden");
  }

  resizeCanvas();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  lastFirework = 0;
  celebrationEndTime = performance.now() + 5500;
  animationFrameId = requestAnimationFrame(animateFireworks);
};

const renderGalleryItem = (index) => {
  const card = photoCards[index];
  if (!card) return;

  const image = card.querySelector("img");
  const title = card.querySelector("h3");
  const description = card.querySelector("p");

  galleryImage.src = image?.src || "";
  galleryImage.alt = image?.alt || "Фото";
  galleryTitle.textContent = title?.textContent || "";
  galleryDescription.textContent = description?.textContent || "";
};

const openGallery = (index) => {
  activePhotoIndex = index;
  renderGalleryItem(activePhotoIndex);
  galleryModal.scrollTop = 0;
  galleryModal.classList.remove("hidden");
  galleryModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const openBonusModal = () => {
  if (!bonusModal) return;
  bonusModal.classList.remove("hidden");
  bonusModal.setAttribute("aria-hidden", "false");
  if (bonusVideo) {
    bonusVideo.currentTime = 0;
    bonusVideo.play().catch(() => {});
  }
};

const closeBonusModal = () => {
  if (!bonusModal) return;
  bonusModal.classList.add("hidden");
  bonusModal.setAttribute("aria-hidden", "true");
  if (bonusVideo) {
    bonusVideo.pause();
    bonusVideo.currentTime = 0;
  }
};

const closeGallery = () => {
  galleryModal.classList.add("hidden");
  galleryModal.setAttribute("aria-hidden", "true");
  galleryModal.scrollTop = 0;
  document.body.style.overflow = "";
};

const showNextPhoto = () => {
  activePhotoIndex = (activePhotoIndex + 1) % photoCards.length;
  renderGalleryItem(activePhotoIndex);
};

const showPrevPhoto = () => {
  activePhotoIndex = (activePhotoIndex - 1 + photoCards.length) % photoCards.length;
  renderGalleryItem(activePhotoIndex);
};

photoCards.forEach((card, index) => {
  card.addEventListener("click", () => openGallery(index));
});

galleryNext.addEventListener("click", showNextPhoto);
galleryPrev.addEventListener("click", showPrevPhoto);
galleryClose.addEventListener("click", closeGallery);

galleryModal.addEventListener("click", (event) => {
  if (event.target === galleryModal) {
    closeGallery();
  }
});

if (bonusBtn) {
  bonusBtn.addEventListener("click", openBonusModal);
}

if (bonusClose) {
  bonusClose.addEventListener("click", closeBonusModal);
}

if (bonusModal) {
  bonusModal.addEventListener("click", (event) => {
    if (event.target === bonusModal) {
      closeBonusModal();
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (!bonusModal.classList.contains("hidden") && event.key === "Escape") {
    closeBonusModal();
    return;
  }

  if (galleryModal.classList.contains("hidden")) return;

  if (event.key === "ArrowRight") {
    showNextPhoto();
  } else if (event.key === "ArrowLeft") {
    showPrevPhoto();
  } else if (event.key === "Escape") {
    closeGallery();
  }
});

yesBtn.addEventListener("click", startCelebration);
window.addEventListener("resize", () => {
  resizeCanvas();
  positionNoButtonNextToYes();
});

enableNoButtonDodge();
