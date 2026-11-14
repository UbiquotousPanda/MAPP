import { useEffect, useState } from 'react';

/** The section being read: the last one whose top has passed the upper third of the window. */
export function useCurrentSection(ids: string[]): string | undefined {
  const key = ids.join(' ');
  const [current, setCurrent] = useState(ids[0]);

  useEffect(() => {
    const all = key.split(' ');
    const update = () => {
      const page = document.documentElement;
      const atEnd =
        window.scrollY > 0 && window.innerHeight + window.scrollY >= page.scrollHeight - 1;
      const passed = all.filter(
        (id) =>
          (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <=
          window.innerHeight / 3,
      );
      setCurrent(atEnd ? all.at(-1) : (passed.at(-1) ?? all[0]));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [key]);

  return current;
}
