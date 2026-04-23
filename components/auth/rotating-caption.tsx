'use client';

import { useEffect, useRef, useState } from 'react';

const CAPTION_SETS = {
  mixed: [
    { kind: 'stat', text: '3,412 offers written with Maakavoda this month.' },
    { kind: 'poetic', text: 'Every offer starts as a cold application.' },
    { kind: 'witty', text: 'Your next job is somewhere in this pipeline.' },
    { kind: 'stat', text: '18% average response rate \u2014 up from 9% industry avg.' },
    { kind: 'poetic', text: 'A board you move by hand. Analytics that follow you.' },
    { kind: 'witty', text: 'Hope is not a pipeline stage. (But \u201cOffer\u201d is.)' },
  ],
  motivational: [
    { kind: 'stat', text: '3,412 people got a callback this week.' },
    { kind: 'stat', text: 'The median user books a first interview in 11 days.' },
    { kind: 'stat', text: '72% of offers started as a cold application.' },
    { kind: 'stat', text: 'Every Monday, 1,800 new roles land in the market.' },
  ],
  editorial: [
    { kind: 'poetic', text: 'Every offer starts as a cold application.' },
    { kind: 'poetic', text: 'The search is linear. The board is honest.' },
    { kind: 'poetic', text: 'A quiet place to keep track of loud ambition.' },
    { kind: 'poetic', text: 'The worst pipeline is the one in your head.' },
  ],
};

type CaptionStyle = 'mixed' | 'motivational' | 'editorial';

interface RotatingCaptionProps {
  style?: CaptionStyle;
}

export function RotatingCaption({ style = 'mixed' }: RotatingCaptionProps) {
  const [text, setText] = useState('');
  const cancelledRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cancelledRef.current = false;
    const set = CAPTION_SETS[style] || CAPTION_SETS.mixed;
    let idx = 0;
    let charIdx = 0;
    let phase: 'typing' | 'hold' | 'deleting' = 'typing';

    function tick() {
      if (cancelledRef.current) return;
      const full = set[idx].text;

      if (phase === 'typing') {
        charIdx++;
        setText(full.slice(0, charIdx));
        if (charIdx >= full.length) {
          phase = 'hold';
          timeoutRef.current = setTimeout(tick, 2400);
          return;
        }
        timeoutRef.current = setTimeout(tick, 28 + Math.random() * 40);
      } else if (phase === 'hold') {
        phase = 'deleting';
        timeoutRef.current = setTimeout(tick, 60);
      } else {
        charIdx = Math.max(0, charIdx - 2);
        setText(full.slice(0, charIdx));
        if (charIdx <= 0) {
          idx = (idx + 1) % set.length;
          phase = 'typing';
          timeoutRef.current = setTimeout(tick, 260);
          return;
        }
        timeoutRef.current = setTimeout(tick, 18);
      }
    }

    tick();

    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [style]);

  return (
    <div className="auth-caption">
      <span className="auth-caption-dot"></span>
      <span className="auth-caption-text">{text}</span>
    </div>
  );
}
