/**
 * Portfolio - Clean Source
 *
 * Features:
 * - Alpine.js store for state management (theme, font, routing)
 * - GSAP page transitions
 * - Custom smooth scroll (physics-based)
 * - Theme toggle (light/dark)
 * - Font toggle (sans-serif/monospaced)
 * - Enter animation (splash screen)
 */

// ============================================================
// Utility: sleep (Promise-based delay)
// ============================================================
function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

// ============================================================
// Utility: Math helpers
// ============================================================
const EMath = {
  constrain(value, min, max) {
    return Math.max(Math.min(value, max), min);
  },
};

// ============================================================
// CDTween: Critical Damping Spring interpolation
// ============================================================
class CDTween {
  constructor(initialValue = 0, omega = 40) {
    this.x = initialValue;
    this.velocity = 0;
    this.omega = omega;
  }

  update(target, dt) {
    const diff = this.x - target;
    const exp = Math.exp(-this.omega * dt);
    this.x = target + (diff + (this.velocity + this.omega * diff) * dt) * exp;
    this.velocity =
      (this.velocity - this.omega * (this.velocity + this.omega * diff) * dt) *
      exp;
  }

  reset() {
    this.x = 0;
    this.velocity = 0;
  }
}

// ============================================================
// ResizeChecker: debounced size-change detector
// ============================================================
class ResizeChecker {
  constructor() {
    this.prevWidth = 0;
    this.prevHeight = 0;
    this.lastCheckTime = 0;
    this.interval = 500;
    this.sizeFunc = null;
  }

  setSizeFunc(func) {
    this.sizeFunc = func;
    const size = func();
    this.prevWidth = size.width;
    this.prevHeight = size.height;
  }

  check() {
    const now = performance.now();
    if (now - this.lastCheckTime < this.interval) return false;
    this.lastCheckTime = now;
    if (!this.sizeFunc) return false;
    const size = this.sizeFunc();
    if (size.width !== this.prevWidth || size.height !== this.prevHeight) {
      this.prevWidth = size.width;
      this.prevHeight = size.height;
      return true;
    }
    return false;
  }
}

// ============================================================
// SmoothScroll: Physics-based custom scroll
// ============================================================
class SmoothScroll {
  constructor() {
    this.$area = null;
    this.$target = null;
    this.targetPosition = 0;
    this.position = 0;
    this.velocity = 0;
    this.acceleration = 0;
    this.k = 0.4;
    this.max = 0;
    this.progress = 0;
    this.isPointerDown = false;
    this.tween = new CDTween(0, 40);
    this.downPos = 0;
    this.prevPos = 0;
    this.isTouch = "ontouchstart" in window;
    this.resizeChecker = new ResizeChecker();

    this._onWheel = this._onWheel.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
  }

  setTargetArea($area) {
    this._removeEvents();
    this.$area = $area;
    this.$target = $area.querySelector($area.dataset.scrollTarget);
    this._addEvents();
    this.reset();
    this.resizeChecker.setSizeFunc(() => {
      const { width, height } = this.$target.getBoundingClientRect();
      return {
        width: width + window.innerWidth,
        height: height + window.innerHeight,
      };
    });
  }

  _addEvents() {
    if (!this.$target) return;
    this.$area.addEventListener("wheel", this._onWheel, { passive: true });
    window.addEventListener("keydown", this._onKeyDown);
    if (this.isTouch) {
      this.$area.addEventListener("touchstart", this._onDown, {
        passive: true,
      });
      this.$area.addEventListener("touchmove", this._onMove, {
        passive: true,
      });
      this.$area.addEventListener("touchend", this._onUp, { passive: true });
    }
  }

  _removeEvents() {
    if (!this.$target) return;
    this.$area.removeEventListener("wheel", this._onWheel);
    window.removeEventListener("keydown", this._onKeyDown);
    if (this.isTouch) {
      this.$area.removeEventListener("touchstart", this._onDown);
      this.$area.removeEventListener("touchmove", this._onMove);
      this.$area.removeEventListener("touchend", this._onUp);
    }
  }

  _getPos(event) {
    return this.isTouch ? event.changedTouches[0].pageY : event.pageY;
  }

  _onWheel(event) {
    this._addTargetPosition(event.deltaY);
  }

  _onKeyDown(event) {
    if (event.code === "ArrowUp") this._addTargetPosition(-500);
    else if (event.code === "ArrowDown") this._addTargetPosition(500);
  }

  _onDown(event) {
    this.isPointerDown = true;
    this.downPos = this._getPos(event);
    this.prevPos = this.downPos;
    this.velocity = 0;
  }

  _onMove(event) {
    if (!this.isPointerDown) return;
    const pos = this._getPos(event);
    this.prevPos = this.downPos;
    this.downPos = pos;
    this._addTargetPosition(this.prevPos - this.downPos);
  }

  _onUp() {
    if (!this.isPointerDown) return;
    this.acceleration = -this.k * (this.position - this.targetPosition);
    this.isPointerDown = false;
  }

  _addTargetPosition(scroll) {
    this.targetPosition = EMath.constrain(
      this.targetPosition + scroll,
      0,
      this.max,
    );
  }

  resize() {
    if (!this.$target) return;
    const { height } = this.$target.getBoundingClientRect();
    const { height: containerHeight } =
      this.$target.parentNode.getBoundingClientRect();
    this.max = Math.max(0, height - containerHeight);
  }

  update(deltaTime) {
    if (this.resizeChecker.check()) this.resize();
    this.velocity += this.acceleration;
    this.targetPosition += this.velocity;
    this.velocity *= 0.9;
    this.acceleration = 0;
    this.targetPosition = EMath.constrain(this.targetPosition, 0, this.max);
    this.tween.update(this.targetPosition, deltaTime);
    if (Math.abs(this.tween.velocity) < 0.01) {
      this.tween.x = this.targetPosition;
    }
    this.position = this.tween.x;
    this.progress =
      this.max > 0 ? EMath.constrain(this.position / this.max, 0, 1) : 0;
    if (this.$target) {
      this.$target.style.transform = `translate3d(0, ${-this.position}px, 0)`;
    }
  }

  reset() {
    this.targetPosition = 0;
    this.position = 0;
    this.velocity = 0;
    this.acceleration = 0;
    this.max = 0;
    this.progress = 0;
    this.tween.reset();
    if (this.$target) {
      this.$target.style.transform = "translate3d(0, 0, 0)";
    }
  }
}

// ============================================================
// AnimationLoop: requestAnimationFrame manager
// ============================================================
class AnimationLoop {
  constructor() {
    this.lastTime = performance.now() * 0.001;
    this.callbacks = [];
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  add(fn) {
    this.callbacks.push(fn);
  }

  _tick(timestamp) {
    requestAnimationFrame(this._tick);
    const time = timestamp * 0.001;
    const deltaTime = time - this.lastTime;
    for (const fn of this.callbacks) {
      fn({ time, deltaTime });
    }
    this.lastTime = time;
  }
}

// ============================================================
// Viewport helpers
// ============================================================
function setViewport() {
  const viewport = document.querySelector('meta[name="viewport"]');
  function update() {
    const value =
      window.outerWidth > 375
        ? "width=device-width,initial-scale=1"
        : "width=375";
    if (viewport.getAttribute("content") !== value) {
      viewport.setAttribute("content", value);
    }
  }
  window.addEventListener("resize", update);
  update();
}

function updateViewportVars() {
  const vw = document.documentElement.clientWidth * 0.01;
  const vh = document.documentElement.clientHeight * 0.01;
  document.documentElement.style.setProperty("--vw", `${vw}px`);
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

// ============================================================
// Main initialization
// ============================================================

// GSAP defaults
gsap.defaults({ ease: "power2.out", overwrite: "auto" });

// Run enter animation immediately (doesn't depend on Alpine)
async function enterAnimation() {
  const $enterView = document.getElementById("EnterView");
  if (!$enterView) return;
  const $t1 = $enterView.querySelector("._t1");
  const $t2 = $enterView.querySelector("._t2");

  await sleep(1.0);
  gsap.to($t1, { opacity: 0, duration: 0.6 });
  gsap.to($t2, { opacity: 0, duration: 0.6, delay: 0.15 });
  await sleep(0.6);
  $enterView.style.pointerEvents = "none";
  gsap.to($enterView, {
    opacity: 0,
    duration: 1,
    onComplete: () => $enterView.remove(),
  });
}

// Start enter animation as soon as DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enterAnimation);
} else {
  enterAnimation();
}

// Viewport setup
setViewport();
updateViewportVars();

// Register Alpine store before Alpine starts (alpine:init fires when Alpine CDN defer script runs)
document.addEventListener("alpine:init", () => {
  const scroll = new SmoothScroll();
  const resizeChecker = new ResizeChecker();
  resizeChecker.setSizeFunc(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  Alpine.store("app", {
    theme: "dark",
    fontStyle: "sans-serif",
    isTransitioning: false,
    pagePaths: ["/", "/projects/", "/info/", "/contact/", "/faq/"],
    currentPath: null,

    init() {
      this.$page = document.getElementById("Page");
      this.pages = {
        "/": document.querySelector('[data-page="home"]'),
        "/projects/": document.querySelector('[data-page="projects"]'),
        "/info/": document.querySelector('[data-page="info"]'),
        "/contact/": document.querySelector('[data-page="contact"]'),
        "/faq/": document.querySelector('[data-page="faq"]'),
      };

      // Detect system theme preference
      const darkMode = window.matchMedia("(prefers-color-scheme: dark)");
      this.theme = darkMode.matches ? "dark" : "light";
      this.changeTheme(this.theme);

      // Set up scroll
      scroll.setTargetArea(this.$page);

      // Show initial page
      this.updateView();

      // SPA link handling (pushState)
      document.querySelectorAll("a[href^='/']").forEach((a) => {
        a.onclick = (e) => {
          e.preventDefault();
          const path = a.getAttribute("href");
          window.history.pushState({}, "", path);
          this.updateView();
        };
      });

      window.addEventListener("popstate", () => this.updateView());
    },

    resize() {
      scroll.resize();
    },

    update(timeInfo) {
      if (this.isTransitioning) return;
      scroll.update(timeInfo.deltaTime);
    },

    toggleTheme() {
      this.changeTheme(this.theme === "dark" ? "light" : "dark");
    },

    changeTheme(theme) {
      if (theme === "dark") {
        document.documentElement.style.setProperty("--c-bg", "hsl(0, 0%, 5%)");
        document.documentElement.style.setProperty(
          "--c-text",
          "hsl(0, 0%, 95%)",
        );
      } else {
        document.documentElement.style.setProperty("--c-bg", "hsl(0, 0%, 90%)");
        document.documentElement.style.setProperty(
          "--c-text",
          "hsl(0, 0%, 10%)",
        );
      }
      this.theme = theme;
    },

    toggleFontStyle() {
      if (this.fontStyle === "sans-serif") {
        this.fontStyle = "mono";
        document.body.classList.add("is-monospaced");
      } else {
        this.fontStyle = "sans-serif";
        document.body.classList.remove("is-monospaced");
      }
    },

    updateView() {
      const path = window.location.pathname;
      this.switchPage(this.pagePaths.includes(path) ? path : "/");
    },

    async switchPage(path) {
      this.isTransitioning = true;
      if (this.currentPath && this.pages[this.currentPath]) {
        this.hidePage(this.pages[this.currentPath]);
        await sleep(0.3);
      }
      scroll.reset();
      this.isTransitioning = false;
      if (this.pages[path]) {
        this.showPage(this.pages[path]);
      }
      this.currentPath = path;
    },

    showPage(el) {
      el.style.display = "block";
      el.classList.remove("is-leaving");
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.9 });
    },

    hidePage(el) {
      el.classList.add("is-leaving");
      gsap.to(el, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          el.style.display = "none";
          el.classList.remove("is-leaving");
        },
      });
    },
  });

  // Main animation loop
  const loop = new AnimationLoop();
  loop.add((timeInfo) => {
    const store = window.Alpine?.store("app");
    if (!store) return;
    if (resizeChecker.check()) {
      updateViewportVars();
      store.resize();
    }
    store.update(timeInfo);
  });
});
