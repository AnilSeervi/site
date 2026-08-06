/**
 * <as-drawer> — a vaul-style bottom sheet, vanilla.
 *
 * Same interaction grammar as Emil Kowalski's vaul (the reference the design
 * asked for), without shipping a React runtime for one dialog: slides up with
 * vaul's spring curve, drags with the pointer, resists upward overdrag, and
 * dismisses on either sufficient distance (>25% of the sheet) or a downward
 * flick (velocity), whichever the release satisfies. Esc and the overlay both
 * close it. Focus moves into the sheet on open and returns to the trigger on
 * close; body scroll is locked while it's up.
 *
 * Markup contract (children, all required):
 *   [data-dw-overlay]  — the scrim
 *   [data-dw-sheet]    — the sheet (role="dialog"; gets tabindex="-1")
 *   [data-dw-body]     — scrollable content region inside the sheet
 *
 * Touch drags use touch events with preventDefault (the palette-sheet pattern)
 * because a pull-down at scrollTop 0 would otherwise be claimed by overscroll
 * and cancel the pointer stream; mouse drags ride pointer events. A drag only
 * begins when the body is scrolled to the top, so flicks over scrolled content
 * scroll natively instead of closing.
 *
 * Owners call open()/close(); `as-drawer:close` fires (bubbling) once a close
 * settles, so the owner can reset its trigger state whatever caused it.
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
  /** element that had focus before open — focus returns there on close */
  #returnTo: HTMLElement | null = null;
  #closeT: ReturnType<typeof setTimeout> | null = null;

  // drag state — y samples carry timestamps so release velocity is real
  #dragging = false;
  #startY = 0;
  #lastMoves: Array<{ t: number; y: number }> = [];

  connectedCallback() {
    this.#overlay = this.querySelector('[data-dw-overlay]')!;
    this.#sheet = this.querySelector('[data-dw-sheet]')!;
    this.#body = this.querySelector('[data-dw-body]')!;
    this.#sheet.setAttribute('tabindex', '-1');

    this.#overlay.addEventListener('click', () => this.close());
    // any [data-dw-close] inside the sheet dismisses it — drag, Esc and the
    // overlay are all invisible affordances, so a real button earns its place
    this.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-dw-close]')) this.close();
    });
    document.addEventListener('keydown', this.#onKey);

    // touch drag (preventDefault path — see header)
    this.#sheet.addEventListener('touchstart', this.#onTouchStart, { passive: true });
    this.#sheet.addEventListener('touchmove', this.#onTouchMove, { passive: false });
    this.#sheet.addEventListener('touchend', this.#onTouchEnd);
    this.#sheet.addEventListener('touchcancel', this.#onTouchEnd);
    // mouse drag
    this.#sheet.addEventListener('pointerdown', this.#onPointerDown);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#onKey);
    if (this.#closeT) clearTimeout(this.#closeT);
    this.#closeT = null;
    // a view transition can swap the page away mid-open — release the lock
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
    // two frames: one to commit the hidden→shown layout, one to transition from it
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

    // transitionend is unreliable when reduced-motion zeroes durations — a
    // fixed timer covers both worlds (the global override makes it instant)
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
    // only from the top of the content — otherwise the gesture is a scroll
    if (!this.#openState || this.#body.scrollTop > 0) return false;
    this.#dragging = true;
    this.#startY = y;
    this.#lastMoves = [{ t: performance.now(), y }];
    this.#sheet.style.transition = 'none';
    return true;
  }

  /** translate for a drag delta — downward follows, upward rubber-bands */
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

    // velocity over the last ~100ms of movement
    const now = performance.now();
    const past = this.#lastMoves.filter((m) => now - m.t <= 110);
    const first = past[0] ?? this.#lastMoves[0]!;
    const vel = now - first.t > 0 ? (y - first.y) / (now - first.t) : 0;

    const h = this.#sheet.getBoundingClientRect().height || 1;
    if (dy > h * DISMISS_FRACTION || vel > DISMISS_VELOCITY) {
      this.close();
      return;
    }
    // spring back
    this.#sheet.style.transition = `transform 320ms ${EASE}`;
    this.#sheet.style.transform = 'translateY(0)';
  }

  #onTouchStart = (e: TouchEvent) => {
    this.#beginDrag(e.touches[0]!.clientY);
  };
  #onTouchMove = (e: TouchEvent) => {
    if (!this.#dragging) return;
    // claiming the gesture stops overscroll from cancelling the drag
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
