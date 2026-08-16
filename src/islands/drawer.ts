/**
 * <as-drawer> — bottom sheet. Required children: [data-dw-overlay], [data-dw-sheet], [data-dw-body].
 * open()/close(); a settled close fires bubbling `as-drawer:close`. Locks body scroll while open.
 */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'; // vaul's curve
const OPEN_MS = 500;
const CLOSE_MS = 420;
/** release thresholds — fraction of sheet height, or px/ms downward */
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY = 0.45;

class AsDrawer extends HTMLElement {
  #overlay!: HTMLElement;
  #sheet!: HTMLElement;
  #body!: HTMLElement;
  #openState = false;
  /** pre-open focus owner — focus must return here on close */
  #returnTo: HTMLElement | null = null;
  #closeT: ReturnType<typeof setTimeout> | null = null;

  // drag state — y samples are timestamped for release velocity
  #dragging = false;
  #startY = 0;
  #lastMoves: Array<{ t: number; y: number }> = [];

  connectedCallback() {
    this.#overlay = this.querySelector('[data-dw-overlay]')!;
    this.#sheet = this.querySelector('[data-dw-sheet]')!;
    this.#body = this.querySelector('[data-dw-body]')!;
    this.#sheet.setAttribute('tabindex', '-1');

    this.#overlay.addEventListener('click', () => this.close());
    this.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-dw-close]')) this.close();
    });
    document.addEventListener('keydown', this.#onKey);

    // touchmove must stay non-passive: it preventDefaults to hold the drag
    this.#sheet.addEventListener('touchstart', this.#onTouchStart, { passive: true });
    this.#sheet.addEventListener('touchmove', this.#onTouchMove, { passive: false });
    this.#sheet.addEventListener('touchend', this.#onTouchEnd);
    this.#sheet.addEventListener('touchcancel', this.#onTouchEnd);
    this.#sheet.addEventListener('pointerdown', this.#onPointerDown);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#onKey);
    if (this.#closeT) clearTimeout(this.#closeT);
    this.#closeT = null;
    // a view transition can unmount this mid-open — release the scroll lock
    if (this.#openState) document.documentElement.style.overflow = '';
  }

  get isOpen() {
    return this.#openState;
  }

  open() {
    if (this.#openState) return;
    this.#openState = true;
    if (this.#closeT) clearTimeout(this.#closeT);
    this.#returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    this.hidden = false;
    this.#sheet.style.transition = 'none';
    this.#sheet.style.transform = 'translateY(100%)';
    // two frames required: commit the hidden→shown layout, then transition from it
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.#sheet.style.transition = `transform ${OPEN_MS}ms ${EASE}`;
        this.#sheet.style.transform = 'translateY(0)';
        this.setAttribute('data-open', '');
      });
    });

    document.documentElement.style.overflow = 'hidden';
    this.#body.scrollTop = 0;
    this.#sheet.focus({ preventScroll: true });
  }

  close() {
    if (!this.#openState) return;
    this.#openState = false;

    this.removeAttribute('data-open'); // overlay fades via CSS
    this.#sheet.style.transition = `transform ${CLOSE_MS}ms ${EASE}`;
    this.#sheet.style.transform = 'translateY(100%)';
    document.documentElement.style.overflow = '';

    // transitionend never fires when reduced-motion zeroes the duration — use a timer
    this.#closeT = setTimeout(() => {
      if (this.#openState) return; // reopened mid-close
      this.hidden = true;
      this.#sheet.style.transition = '';
      this.#sheet.style.transform = '';
      this.#returnTo?.focus({ preventScroll: true });
      this.#returnTo = null;
      this.dispatchEvent(new CustomEvent('as-drawer:close', { bubbles: true }));
    }, CLOSE_MS + 40);
  }

  #onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.#openState) {
      e.preventDefault();
      this.close();
    }
  };

  // ---- drag ----------------------------------------------------------------

  #beginDrag(y: number): boolean {
    // only from scrollTop 0, else the gesture belongs to the scroller
    if (!this.#openState || this.#body.scrollTop > 0) return false;
    this.#dragging = true;
    this.#startY = y;
    this.#lastMoves = [{ t: performance.now(), y }];
    this.#sheet.style.transition = 'none';
    return true;
  }

  /** downward follows the pointer 1:1, upward rubber-bands at 1/8 */
  #applyDrag(y: number) {
    const dy = y - this.#startY;
    this.#lastMoves.push({ t: performance.now(), y });
    if (this.#lastMoves.length > 6) this.#lastMoves.shift();
    this.#sheet.style.transform = `translateY(${dy > 0 ? dy : dy / 8}px)`;
  }

  #endDrag(y: number) {
    if (!this.#dragging) return;
    this.#dragging = false;
    const dy = y - this.#startY;

    // px/ms over the last ~100ms of movement
    const now = performance.now();
    const past = this.#lastMoves.filter((m) => now - m.t <= 110);
    const first = past[0] ?? this.#lastMoves[0]!;
    const vel = now - first.t > 0 ? (y - first.y) / (now - first.t) : 0;

    const h = this.#sheet.getBoundingClientRect().height || 1;
    if (dy > h * DISMISS_FRACTION || vel > DISMISS_VELOCITY) {
      this.close();
      return;
    }
    this.#sheet.style.transition = `transform 320ms ${EASE}`;
    this.#sheet.style.transform = 'translateY(0)';
  }

  #onTouchStart = (e: TouchEvent) => {
    this.#beginDrag(e.touches[0]!.clientY);
  };
  #onTouchMove = (e: TouchEvent) => {
    if (!this.#dragging) return;
    // claim the gesture, or overscroll cancels the drag
    if (e.touches[0]!.clientY - this.#startY > 0) e.preventDefault();
    this.#applyDrag(e.touches[0]!.clientY);
  };
  #onTouchEnd = (e: TouchEvent) => {
    this.#endDrag(e.changedTouches[0]?.clientY ?? this.#startY);
  };

  #onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return; // touch rides the listeners above
    if (!this.#beginDrag(e.clientY)) return;
    const move = (ev: PointerEvent) => this.#applyDrag(ev.clientY);
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      this.#endDrag(ev.clientY);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
}

if (!customElements.get('as-drawer')) customElements.define('as-drawer', AsDrawer);
