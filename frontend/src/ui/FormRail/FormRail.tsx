import { CircleCheck } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { FormSection } from '../FormSection/FormSection';
import { scrollBehavior } from '../motion';
import { filledText } from './form-progress';
import type { RailSection } from './form-progress';
import styles from './FormRail.module.css';
import { useCurrentSection } from './useCurrentSection';

/** The centred column a form page's header, form and footer share (design system §2.4 C). */
export function FormPage({ children }: { children: ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}

/** "On this page", sticky under the top bar; `children` under it stay in view as well. */
export function SectionBar({
  sections,
  children,
}: {
  sections: RailSection[];
  children?: ReactNode;
}) {
  const current = useCurrentSection(sections.map((section) => section.id));
  return (
    <div className={styles.sticky}>
      <nav className={styles.bar} aria-label="On this page">
        <ul className={styles.list}>
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={styles.link}
                aria-current={section.id === current ? 'location' : undefined}
                onClick={jumpTo}
              >
                {section.title} <SectionStatus section={section} />
              </a>
            </li>
          ))}
        </ul>
        <p className={styles.total}>{filledText(sections)}</p>
      </nav>
      {children}
    </div>
  );
}

function SectionStatus({ section }: { section: RailSection }) {
  if (section.needed === 0) {
    return null;
  }
  return section.missing === 0 ? (
    <CircleCheck aria-label="all filled in" className={styles.done} />
  ) : (
    <span className={styles.count}>{section.missing} needed</span>
  );
}

/** Moves the focus to the section's first field as well as scrolling to it. */
function jumpTo(event: MouseEvent<HTMLAnchorElement>) {
  const id = event.currentTarget.getAttribute('href')?.slice(1);
  const section = id ? document.getElementById(id) : null;
  if (!section) {
    return;
  }
  event.preventDefault();
  section.scrollIntoView?.({ behavior: scrollBehavior(), block: 'start' });
  const field =
    section.querySelector<HTMLElement>('input, select, textarea') ??
    section.querySelector<HTMLElement>('button');
  field?.focus({ preventScroll: true });
}

/** The section bar, `extra` under it (the line item's summary strip), then the form's cards. */
export function FormLayout({
  sections,
  extra,
  children,
}: {
  sections: RailSection[];
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.column}>
      <SectionBar sections={sections}>{extra}</SectionBar>
      {children}
    </div>
  );
}

export function FormCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className={styles.formCard}>
      <FormSection title={title} description={description}>
        {children}
      </FormSection>
    </div>
  );
}

/** A section's card around content that draws its own headings; with a label it is a region. */
export function FormCardFrame({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = className ? `${styles.formCard} ${className}` : styles.formCard;
  return label ? (
    <section id={id} aria-label={label} className={classes}>
      {children}
    </section>
  ) : (
    <div id={id} className={classes}>
      {children}
    </div>
  );
}
