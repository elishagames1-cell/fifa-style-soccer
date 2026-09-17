// זיהוי מכשיר מגע ובניית שליטה למגע (ג'ויסטיק וירטואלי + כפתורי פעולה) עבור מסך המשחק
export const touchState = {
  moveX: 0,
  moveY: 0,
  sprint: false,
  pass: false,
  shoot: false,
  tackle: false,
  tab: false,
};

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function initTouchControls(container) {
  if (!isTouchDevice()) return;
  document.body.classList.add('touch-device');

  const wrap = document.createElement('div');
  wrap.className = 'touch-controls';
  wrap.innerHTML = `
    <div class="joystick-base" id="joystickBase">
      <div class="joystick-knob" id="joystickKnob"></div>
    </div>
    <div class="action-buttons">
      <button class="touch-btn btn-tab" id="btnTab" type="button">SWITCH</button>
      <button class="touch-btn btn-sprint" id="btnSprint" type="button">SPRINT</button>
      <button class="touch-btn btn-tackle" id="btnTackle" type="button">TACKLE</button>
      <button class="touch-btn btn-pass" id="btnPass" type="button">PASS</button>
      <button class="touch-btn btn-shoot" id="btnShoot" type="button">SHOOT</button>
    </div>
  `;
  container.appendChild(wrap);

  setupJoystick(document.getElementById('joystickBase'), document.getElementById('joystickKnob'));
  setupButton(document.getElementById('btnSprint'), (v) => (touchState.sprint = v));
  setupButton(document.getElementById('btnPass'), (v) => (touchState.pass = v));
  setupButton(document.getElementById('btnShoot'), (v) => (touchState.shoot = v));
  setupButton(document.getElementById('btnTackle'), (v) => (touchState.tackle = v));
  setupButton(document.getElementById('btnTab'), (v) => (touchState.tab = v));
}

function setupButton(el, setter) {
  const start = (e) => { e.preventDefault(); setter(true); };
  const end = (e) => { e.preventDefault(); setter(false); };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', end);
}

function setupJoystick(base, knob) {
  const radius = 40;
  let activeId = null;

  function updateFromEvent(e) {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) {
      dx = (dx / dist) * radius;
      dy = (dy / dist) * radius;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touchState.moveX = dx / radius;
    touchState.moveY = dy / radius;
  }

  function reset() {
    knob.style.transform = 'translate(0px, 0px)';
    touchState.moveX = 0;
    touchState.moveY = 0;
    activeId = null;
  }

  base.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    activeId = e.pointerId;
    base.setPointerCapture(activeId);
    updateFromEvent(e);
  });
  base.addEventListener('pointermove', (e) => {
    if (activeId !== e.pointerId) return;
    e.preventDefault();
    updateFromEvent(e);
  });
  base.addEventListener('pointerup', (e) => {
    if (activeId !== e.pointerId) return;
    reset();
  });
  base.addEventListener('pointercancel', reset);
}
