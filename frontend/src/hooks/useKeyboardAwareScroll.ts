import { useEffect, RefObject } from 'react';

const isEditable = (el: Element | null): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

const visibleBottom = (): number => {
  const vv = window.visualViewport;
  if (vv) return vv.offsetTop + vv.height;
  return window.innerHeight;
};

const visibleTop = (): number => window.visualViewport?.offsetTop ?? 0;

/** Подкручивает активное поле над клавиатурой Android/iOS. */
export function useKeyboardAwareScroll(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const root = containerRef.current;
    if (!root) return undefined;

    let timer1 = 0;
    let timer2 = 0;

    const updateKeyboardInset = () => {
      const vv = window.visualViewport;
      if (!vv) {
        document.documentElement.style.setProperty('--keyboard-inset', '0px');
        return 0;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
      return inset;
    };

    const scrollFocusedIntoView = () => {
      const el = document.activeElement;
      if (!isEditable(el) || !root.contains(el)) return;

      const rect = el.getBoundingClientRect();
      const top = visibleTop();
      const bottom = visibleBottom();
      const margin = 28;

      if (rect.bottom > bottom - margin || rect.top < top + margin) {
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }
    };

    const scheduleScroll = () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      timer1 = window.setTimeout(scrollFocusedIntoView, 80);
      timer2 = window.setTimeout(scrollFocusedIntoView, 320);
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isEditable(event.target as Element)) return;
      scheduleScroll();
    };

    const onViewportChange = () => {
      const inset = updateKeyboardInset();
      if (inset > 60) scheduleScroll();
    };

    updateKeyboardInset();
    root.addEventListener('focusin', onFocusIn);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);
    window.addEventListener('resize', onViewportChange);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      root.removeEventListener('focusin', onFocusIn);
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
      window.removeEventListener('resize', onViewportChange);
      document.documentElement.style.setProperty('--keyboard-inset', '0px');
    };
  }, [containerRef, enabled]);
}
