// oneko.js — a cat that walks to wherever you click.
// Vendored from https://github.com/adryd325/oneko.js (public domain).
// Sprite path is passed via the script tag's data-cat attribute; see Base.astro.
// Local change: upstream chases the cursor on every mousemove, which keeps
// something moving in the corner of the eye the whole time you are reading.
// Here the cat sits still and only sets off when you deliberately click,
// chasing a laser dot that it pounces on when it catches up. It is placed in
// document coordinates, so it stands on the page and scrolls with it.

(function oneko() {
  const isReducedMotion =
    window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
    window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

  if (isReducedMotion) return;

  const nekoEl = document.createElement("div");
  const toyEl = document.createElement("div");
  let toyLitAt = 0;
  let persistPosition = true;

  let nekoPosX = 32;
  let nekoPosY = 32;

  let mousePosX = 0;
  let mousePosY = 0;

  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation = null;
  let idleAnimationFrame = 0;

  const nekoSpeed = 10;
  const spriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [
      [-5, 0],
      [-6, 0],
      [-7, 0],
    ],
    scratchWallN: [
      [0, 0],
      [0, -1],
    ],
    scratchWallS: [
      [-7, -1],
      [-6, -2],
    ],
    scratchWallE: [
      [-2, -2],
      [-2, -3],
    ],
    scratchWallW: [
      [-4, 0],
      [-4, -1],
    ],
    tired: [[-3, -2]],
    sleeping: [
      [-2, 0],
      [-2, -1],
    ],
    N: [
      [-1, -2],
      [-1, -3],
    ],
    NE: [
      [0, -2],
      [0, -3],
    ],
    E: [
      [-3, 0],
      [-3, -1],
    ],
    SE: [
      [-5, -1],
      [-5, -2],
    ],
    S: [
      [-6, -3],
      [-7, -2],
    ],
    SW: [
      [-5, -3],
      [-6, -1],
    ],
    W: [
      [-4, -2],
      [-4, -3],
    ],
    NW: [
      [-1, 0],
      [-1, -1],
    ],
  };

  const toyStyles = `
    #oneko-toy {
      position: absolute;
      width: 10px;
      height: 10px;
      margin: -5px 0 0 -5px;
      border-radius: 50%;
      background: var(--toy, #FD6360);
      box-shadow: 0 0 8px var(--toy, #FD6360);
      pointer-events: none;
      opacity: 0;
      z-index: 2147483646;
    }
    #oneko-toy.lit {
      opacity: 1;
      animation: oneko-toy-pulse 0.9s ease-in-out infinite;
    }
    #oneko-toy.lit::after {
      content: "";
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      border: 2px solid var(--toy, #FD6360);
      animation: oneko-toy-ring 0.5s ease-out forwards;
    }
    #oneko-toy.caught {
      opacity: 1;
      animation: oneko-toy-caught 0.22s ease-in forwards;
    }
    @keyframes oneko-toy-ring {
      from { transform: scale(0.4); opacity: 0.85; }
      to   { transform: scale(3.2); opacity: 0; }
    }
    @keyframes oneko-toy-pulse {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(0.7); }
    }
    @keyframes oneko-toy-caught {
      to { transform: scale(0); opacity: 0; }
    }
  `;

  function pageBounds() {
    const root = document.documentElement;
    return {
      width: Math.max(root.scrollWidth, root.clientWidth),
      height: Math.max(root.scrollHeight, root.clientHeight),
    };
  }

  function renderNeko() {
    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
  }

  // If the cat is parked somewhere you have since scrolled away from, let it
  // come running in from the nearest edge instead of trudging the whole page.
  function recallIntoView() {
    const margin = 40;
    const minX = window.scrollX - margin;
    const maxX = window.scrollX + window.innerWidth + margin;
    const minY = window.scrollY - margin;
    const maxY = window.scrollY + window.innerHeight + margin;
    nekoPosX = Math.min(Math.max(nekoPosX, minX), maxX);
    nekoPosY = Math.min(Math.max(nekoPosY, minY), maxY);
  }

  function litToy(x, y) {
    // keep the dot inside the page so it can never add a scrollbar
    const page = pageBounds();
    toyEl.style.left = `${Math.min(Math.max(x, 6), page.width - 6)}px`;
    toyEl.style.top = `${Math.min(Math.max(y, 6), page.height - 6)}px`;
    // restart the ring even if the dot is already lit
    toyEl.classList.remove("lit", "caught");
    void toyEl.offsetWidth;
    toyEl.classList.add("lit");
    toyLitAt = Date.now();
  }

  function catchToy() {
    if (!toyEl.classList.contains("lit")) return;
    // let the dot live long enough to be seen when you click right next to the cat
    if (Date.now() - toyLitAt < 320) return;
    toyEl.classList.remove("lit");
    toyEl.classList.add("caught");
    // bat at it for a moment
    idleAnimation = "scratchSelf";
    idleAnimationFrame = 0;
  }

  function init() {
    let nekoFile = "./oneko.gif";
    const curScript = document.currentScript;
    if (curScript && curScript.dataset.cat) {
      nekoFile = curScript.dataset.cat;
    }
    if (curScript && curScript.dataset.persistPosition) {
      if (curScript.dataset.persistPosition === "") {
        persistPosition = true;
      } else {
        persistPosition = JSON.parse(curScript.dataset.persistPosition.toLowerCase());
      }
    }

    if (persistPosition) {
      let storedNeko = JSON.parse(window.localStorage.getItem("oneko"));
      if (storedNeko !== null) {
        nekoPosX = storedNeko.nekoPosX;
        nekoPosY = storedNeko.nekoPosY;
        mousePosX = storedNeko.mousePosX;
        mousePosY = storedNeko.mousePosY;
        frameCount = storedNeko.frameCount;
        idleTime = storedNeko.idleTime;
        idleAnimation = storedNeko.idleAnimation;
        idleAnimationFrame = storedNeko.idleAnimationFrame;
        nekoEl.style.backgroundPosition = storedNeko.bgPos;
      }
    }

    // Target the cat's own position, so a fresh load (or a restored one) sits
    // perfectly still until the first click.
    mousePosX = nekoPosX;
    mousePosY = nekoPosY;

    nekoEl.id = "oneko";
    nekoEl.ariaHidden = true;
    nekoEl.style.width = "32px";
    nekoEl.style.height = "32px";
    nekoEl.style.position = "absolute";
    nekoEl.style.pointerEvents = "none";
    nekoEl.style.imageRendering = "pixelated";
    nekoEl.style.zIndex = 2147483647;
    renderNeko();

    nekoEl.style.backgroundImage = `url(${nekoFile})`;

    document.body.appendChild(nekoEl);

    const styleEl = document.createElement("style");
    styleEl.textContent = toyStyles;
    document.head.appendChild(styleEl);

    toyEl.id = "oneko-toy";
    toyEl.ariaHidden = true;
    document.body.appendChild(toyEl);

    document.addEventListener("click", function (event) {
      // leave real interactions alone: clicking a paper title should open the
      // paper, not send the cat running across the page on the way out
      const target = event.target;
      if (
        target &&
        typeof target.closest === "function" &&
        target.closest("a, button, summary, input, textarea, select, label")
      ) {
        return;
      }
      // dragging across text to copy it is not a summons
      const selection = window.getSelection();
      if (selection && String(selection).length > 0) {
        return;
      }
      mousePosX = event.pageX;
      mousePosY = event.pageY;
      recallIntoView();
      renderNeko();
      litToy(mousePosX, mousePosY);
    });

    if (persistPosition) {
      window.addEventListener("beforeunload", function () {
        window.localStorage.setItem(
          "oneko",
          JSON.stringify({
            nekoPosX: nekoPosX,
            nekoPosY: nekoPosY,
            mousePosX: mousePosX,
            mousePosY: mousePosY,
            frameCount: frameCount,
            idleTime: idleTime,
            idleAnimation: idleAnimation,
            idleAnimationFrame: idleAnimationFrame,
            bgPos: nekoEl.style.backgroundPosition,
          })
        );
      });
    }

    window.requestAnimationFrame(onAnimationFrame);
  }

  let lastFrameTimestamp;

  function onAnimationFrame(timestamp) {
    // Stops execution if the neko element is removed from DOM
    if (!nekoEl.isConnected) {
      return;
    }
    if (!lastFrameTimestamp) {
      lastFrameTimestamp = timestamp;
    }
    if (timestamp - lastFrameTimestamp > 100) {
      lastFrameTimestamp = timestamp;
      frame();
    }
    window.requestAnimationFrame(onAnimationFrame);
  }

  function setSprite(name, frame) {
    const sprite = spriteSets[name][frame % spriteSets[name].length];
    nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }

  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function idle() {
    idleTime += 1;

    // every ~ 20 seconds
    if (
      idleTime > 10 &&
      Math.floor(Math.random() * 200) == 0 &&
      idleAnimation == null
    ) {
      let avalibleIdleAnimations = ["sleeping", "scratchSelf"];
      const page = pageBounds();
      if (nekoPosX < 32) {
        avalibleIdleAnimations.push("scratchWallW");
      }
      if (nekoPosY < 32) {
        avalibleIdleAnimations.push("scratchWallN");
      }
      if (nekoPosX > page.width - 32) {
        avalibleIdleAnimations.push("scratchWallE");
      }
      if (nekoPosY > page.height - 32) {
        avalibleIdleAnimations.push("scratchWallS");
      }
      idleAnimation =
        avalibleIdleAnimations[
          Math.floor(Math.random() * avalibleIdleAnimations.length)
        ];
    }

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) {
          resetIdleAnimation();
        }
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) {
          resetIdleAnimation();
        }
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleAnimationFrame += 1;
  }

  function frame() {
    frameCount += 1;
    const diffX = nekoPosX - mousePosX;
    const diffY = nekoPosY - mousePosY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (distance < nekoSpeed || distance < 48) {
      catchToy();
      idle();
      return;
    }

    idleAnimation = null;
    idleAnimationFrame = 0;

    if (idleTime > 1) {
      setSprite("alert", 0);
      // count down after being alerted before moving
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      return;
    }

    let direction;
    direction = diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    setSprite(direction, frameCount);

    nekoPosX -= (diffX / distance) * nekoSpeed;
    nekoPosY -= (diffY / distance) * nekoSpeed;

    const page = pageBounds();
    nekoPosX = Math.min(Math.max(16, nekoPosX), page.width - 16);
    nekoPosY = Math.min(Math.max(16, nekoPosY), page.height - 16);

    renderNeko();
  }

  init();
})();
