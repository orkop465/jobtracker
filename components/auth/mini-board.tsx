'use client';

import { useEffect, useRef } from 'react';
import {
  type BoardCard,
  type BoardStage,
  boardRandomCard,
  boardRandomTag,
  generateRandomBoard,
} from '@/lib/landing/design-board-data';

const COLUMNS: { id: BoardStage; name: string; dot: string }[] = [
  { id: 'applied', name: 'Applied', dot: 'var(--sky)' },
  { id: 'phone', name: 'Phone screen', dot: 'var(--sage)' },
  { id: 'interview', name: 'Interview', dot: 'var(--amber)' },
  { id: 'offer', name: 'Offer', dot: 'var(--accent)' },
];

const STAGE_ORDER: BoardStage[] = ['applied', 'phone', 'interview', 'offer'];

const MOVE_DUR_BASE = 1600;
const MOVE_DUR_BUFFER = 2500;
const SPAWN_DUR = 1700;
const FADE_DUR = 500;
const GAP = 1600;

/**
 * Imperative mini kanban board — ports auth.js mountMiniBoard verbatim.
 * React only provides the container div; all DOM manipulation and
 * FLIP animations are done imperatively to match the original exactly.
 */
export function MiniBoard() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    // Local const so TS narrows inside closures
    const root: HTMLDivElement = rootEl;

    const cards: BoardCard[] = generateRandomBoard();
    const cardEls = new Map<number, HTMLDivElement>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    /* ---- Build column DOM ---- */
    function buildColumns() {
      root.innerHTML = '';
      COLUMNS.forEach((col) => {
        const colEl = document.createElement('div');
        colEl.className = 'auth-col';
        colEl.dataset.col = col.id;
        colEl.innerHTML = `
          <div class="auth-col-head">
            <span class="auth-col-dot" style="background:${col.dot}"></span>
            <span>${col.name}</span>
            <span class="auth-col-count" data-count></span>
          </div>
          <div class="auth-col-body" data-body></div>
        `;
        root.appendChild(colEl);
      });
    }

    /* ---- Card element helpers ---- */
    function makeCardEl(c: BoardCard): HTMLDivElement {
      const el = document.createElement('div');
      el.className = 'auth-card';
      el.dataset.cid = String(c.id);
      el.innerHTML = `
        <div class="auth-card-co"></div>
        <div class="auth-card-title"></div>
        <div class="auth-card-meta-wrap"></div>
      `;
      updateCardEl(el, c);
      return el;
    }

    function updateCardEl(el: HTMLDivElement, c: BoardCard) {
      const coEl = el.querySelector('.auth-card-co');
      const titleEl = el.querySelector('.auth-card-title');
      const metaEl = el.querySelector('.auth-card-meta-wrap');
      if (coEl) coEl.textContent = c.co;
      if (titleEl) titleEl.textContent = c.title;
      if (metaEl) {
        metaEl.innerHTML = c.tag
          ? `<div class="auth-card-meta"><span class="auth-card-tag">${c.tag}</span></div>`
          : '';
      }
    }

    /* ---- Position snapshot helpers ---- */
    function snapshotY(container: Element): Map<Element, number> {
      const map = new Map<Element, number>();
      container.querySelectorAll('.auth-card').forEach((c) => {
        map.set(c, c.getBoundingClientRect().top);
      });
      return map;
    }

    function slideSiblings(container: Element, beforeMap: Map<Element, number>) {
      const elems = Array.from(container.querySelectorAll('.auth-card')) as HTMLElement[];
      elems.forEach((c) => {
        const oldY = beforeMap.get(c);
        if (oldY == null) return;
        const newY = c.getBoundingClientRect().top;
        const dy = oldY - newY;
        if (Math.abs(dy) < 1) return;
        c.style.transition = 'none';
        c.style.transform = `translateY(${dy}px)`;
        c.getBoundingClientRect(); // force reflow
        c.style.transition = 'transform 450ms cubic-bezier(0.2, 0, 0, 1)';
        c.style.transform = '';
        setTimeout(() => { c.style.transition = ''; }, 460);
      });
    }

    /* ---- Animate move (FLIP flight) ---- */
    function animateMove(
      el: HTMLDivElement,
      firstRect: DOMRect,
      lastRect: DOMRect,
      duration: number,
      placeholder: HTMLDivElement,
    ) {
      const dxTotal = lastRect.left - firstRect.left;
      const dyTotal = lastRect.top - firstRect.top;
      const w = lastRect.width;
      const h = lastRect.height;

      // Lift card out of flow into fixed overlay at START position
      document.body.appendChild(el);
      el.dataset.moving = '1';
      el.style.position = 'fixed';
      el.style.left = firstRect.left + 'px';
      el.style.top = firstRect.top + 'px';
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.style.margin = '0';
      el.style.zIndex = '99';
      el.style.transition = 'none';
      el.style.transform = 'translate(0, 0)';
      el.style.willChange = 'transform, box-shadow';
      el.classList.add('is-moving');
      el.getBoundingClientRect(); // force reflow

      // Animate card flight to destination
      el.style.transition = `transform ${duration}ms cubic-bezier(0.34, 1.1, 0.4, 1)`;
      el.style.transform = `translate(${dxTotal}px, ${dyTotal}px)`;

      // After card has visually departed, remove placeholder and slide siblings up
      const collapseDelay = Math.min(500, duration * 0.3);
      setTimeout(() => {
        if (destroyed) return;
        const container = placeholder.parentElement;
        if (!container) return;
        const before = snapshotY(container);
        placeholder.remove();
        slideSiblings(container, before);
      }, collapseDelay);

      // Land card at destination column with smooth FLIP
      setTimeout(() => {
        if (destroyed) return;
        const flyRect = el.getBoundingClientRect();

        el.style.visibility = 'hidden';
        el.classList.remove('is-moving');
        delete el.dataset.moving;
        el.style.transition = 'none';
        el.style.transform = '';
        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        el.style.width = '';
        el.style.height = '';
        el.style.margin = '';
        el.style.zIndex = '';
        el.style.willChange = '';

        const cardData = cards.find((c) => cardEls.get(c.id) === el);
        if (cardData) {
          const destCol = getColBody(cardData.stage);
          if (destCol) {
            const before = snapshotY(destCol);
            destCol.appendChild(el);
            const landRect = el.getBoundingClientRect();
            const dx = flyRect.left - landRect.left;
            const dy = flyRect.top - landRect.top;
            el.style.transform = `translate(${dx}px, ${dy}px)`;
            el.style.visibility = '';
            el.getBoundingClientRect(); // force reflow
            requestAnimationFrame(() => {
              el.style.transition = 'transform 350ms cubic-bezier(0.2, 0, 0, 1)';
              el.style.transform = 'translate(0,0)';
              setTimeout(() => { el.style.transition = ''; el.style.transform = ''; }, 360);
            });
            slideSiblings(destCol, before);
          }
        } else {
          el.style.visibility = '';
        }
        if (placeholder.parentElement) placeholder.remove();
      }, duration + 40);
    }

    /* ---- Animate fade ---- */
    function animateFade(el: HTMLDivElement) {
      const container = el.parentElement;
      if (!container) return;
      el.style.pointerEvents = 'none';
      el.style.transition = 'opacity 0.4s ease-in, transform 0.4s ease-in';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.95)';

      setTimeout(() => {
        if (destroyed) return;
        const before = snapshotY(container);
        el.remove();
        slideSiblings(container, before);
      }, 420);
    }

    /* ---- DOM helpers ---- */
    function getColBody(stageId: string): HTMLElement | null {
      return root.querySelector(`.auth-col[data-col="${stageId}"] [data-body]`);
    }

    function updateCounts() {
      COLUMNS.forEach((col) => {
        const countEl = root.querySelector(`.auth-col[data-col="${col.id}"] [data-count]`);
        if (countEl) countEl.textContent = String(cards.filter((c) => c.stage === col.id).length);
      });
    }

    /* ---- Core sync: reconcile card data → DOM ---- */
    function syncDom(movingId: number | null = null) {
      updateCounts();

      // 1. Handle removals
      const validIds = new Set(cards.map((c) => c.id));
      cardEls.forEach((el, id) => {
        if (!validIds.has(id)) {
          animateFade(el);
          cardEls.delete(id);
        }
      });

      // 2. Handle moving card
      if (movingId != null) {
        const movingCard = cards.find((c) => c.id === movingId);
        const el = cardEls.get(movingId);
        if (movingCard && el && !el.dataset.moving) {
          updateCardEl(el, movingCard);
          const firstRect = el.getBoundingClientRect();
          const sourceParent = el.parentElement;
          const destBody = getColBody(movingCard.stage);

          // Placeholder holds the gap in source column
          const placeholder = document.createElement('div') as HTMLDivElement;
          placeholder.style.width = firstRect.width + 'px';
          placeholder.style.height = firstRect.height + 'px';
          placeholder.style.flex = '0 0 auto';
          if (sourceParent) sourceParent.insertBefore(placeholder, el);

          // Measure destination via invisible probe
          const probe = document.createElement('div');
          probe.style.height = firstRect.height + 'px';
          probe.style.visibility = 'hidden';
          if (destBody) destBody.appendChild(probe);
          const lastRect = probe.getBoundingClientRect();
          probe.remove();

          const distance = Math.hypot(lastRect.left - firstRect.left, lastRect.top - firstRect.top);
          const duration = Math.max(1500, Math.min(2400, 900 + distance * 2.2));
          animateMove(el, firstRect, lastRect, duration, placeholder);

          // Safety net: ensure card lands in dest column
          setTimeout(() => {
            if (destroyed) return;
            if (!el.dataset.moving && destBody) {
              if (el.parentElement === document.body || el.parentElement !== destBody) {
                destBody.appendChild(el);
              }
            }
          }, duration + 50);
        }
      }

      // 3. Handle new cards (spawn) with slide siblings + fade-in animation
      cards.forEach((c) => {
        if (cardEls.has(c.id)) return;
        const el = makeCardEl(c);
        cardEls.set(c.id, el);
        const body = getColBody(c.stage);
        if (!body) return;

        const before = snapshotY(body);
        el.style.opacity = '0';
        el.style.transform = 'translateY(-28px) scale(0.7) rotate(-4deg)';
        el.style.boxShadow = '0 0 0 2px oklch(0.7 0.17 55 / 0.9), 0 0 20px oklch(0.7 0.17 55 / 0.5)';
        el.style.zIndex = '7';
        body.appendChild(el);
        slideSiblings(body, before);

        requestAnimationFrame(() => {
          el.style.transition =
            'opacity 0.45s ease-out, transform 1.1s cubic-bezier(0.34, 1.56, 0.5, 1), box-shadow 1.4s ease-out 0.3s';
          el.style.opacity = '1';
          el.style.transform = '';
          setTimeout(() => { el.style.boxShadow = ''; }, 300);
          setTimeout(() => {
            el.style.transition = '';
            el.style.boxShadow = '';
            el.style.zIndex = '';
          }, 1600);
        });
      });
    }

    /* ---- Actions ---- */
    function doSpawn(): number {
      if (cards.filter((c) => c.stage === 'applied').length >= 4) return 0;
      const { co, title, resume, color } = boardRandomCard();
      cards.push({
        id: Date.now() + Math.random(),
        co,
        title,
        resume,
        color,
        stage: 'applied',
        tag: boardRandomTag('applied'),
      });
      syncDom(null);
      return SPAWN_DUR;
    }

    function doFade(): number {
      const removable = cards.filter((c) => c.stage !== 'offer');
      if (!removable.length) return 0;
      const pick = removable[Math.floor(Math.random() * removable.length)];
      const idx = cards.indexOf(pick);
      if (idx !== -1) cards.splice(idx, 1);
      syncDom(null);
      return FADE_DUR;
    }

    function doMove(): number {
      const movable = cards.filter((c) => c.stage !== 'offer');
      if (!movable.length) return 0;
      const pick = movable[Math.floor(Math.random() * movable.length)];
      const curIdx = STAGE_ORDER.indexOf(pick.stage);
      let jump = 1;
      if (Math.random() < 0.2) jump = 2;
      jump = Math.min(jump, STAGE_ORDER.length - 1 - curIdx);

      const destStage = STAGE_ORDER[curIdx + jump];

      // If offer full, fade instead
      if (destStage === 'offer' && cards.filter((c) => c.stage === 'offer').length >= 5) {
        const idx = cards.indexOf(pick);
        if (idx !== -1) cards.splice(idx, 1);
        syncDom(null);
        return FADE_DUR;
      }

      pick.stage = destStage;
      pick.tag = boardRandomTag(destStage);
      syncDom(pick.id);
      return Math.min(MOVE_DUR_BUFFER, MOVE_DUR_BASE + jump * 350);
    }

    /* ---- Tick loop ---- */
    function tick() {
      if (destroyed) return;

      const totalCards = cards.length;
      const r = Math.random();
      let action: 'spawn' | 'move' | 'fade';

      if (totalCards <= 5) {
        action = r < 0.5 ? 'spawn' : r < 0.85 ? 'move' : 'fade';
      } else if (totalCards >= 10) {
        action = r < 0.15 ? 'spawn' : r < 0.7 ? 'move' : 'fade';
      } else {
        action = r < 0.3 ? 'spawn' : r < 0.8 ? 'move' : 'fade';
      }

      let duration = 0;
      if (action === 'spawn') duration = doSpawn();
      else if (action === 'fade') duration = doFade();
      else duration = doMove();

      timer = setTimeout(tick, duration + GAP);
    }

    /* ---- Init ---- */
    buildColumns();
    syncDom();
    timer = setTimeout(tick, 1200);

    return () => {
      destroyed = true;
      if (timer) clearTimeout(timer);
      // Clean up any cards that were moved to document.body during flight
      cardEls.forEach((el) => {
        if (el.parentElement === document.body) el.remove();
      });
    };
  }, []);

  return <div className="auth-board" ref={rootRef} />;
}
