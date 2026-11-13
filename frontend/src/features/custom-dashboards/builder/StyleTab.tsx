import { CheckboxField } from '@/ui/CheckboxField/CheckboxField';
import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
import { TextAreaField } from '@/ui/TextAreaField/TextAreaField';
import { TextField } from '@/ui/TextField/TextField';
import { ChoiceField } from '@/ui/ChoiceField/ChoiceField';
import type { Widget, WidgetDisplay } from '../model';
import { choices } from './choices';
import { StyleAxes } from './StyleAxes';
import { defaultDataLabels, defaultPalette, PALETTES, shows } from './style-options';
import type { StyleSectionProps } from './style-options';
import { StyleValues } from './StyleValues';
import styles from './Inspector.module.css';

type TextPatch = Partial<Pick<Widget, 'title' | 'subtitle' | 'note'>>;
type Legend = NonNullable<WidgetDisplay['legend']>;

const LEGEND_POSITIONS: { value: Legend['position']; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

export interface StyleTabProps {
  widget: Widget;
  errorAt: (path: string) => string | undefined;
  onDisplay: (display: WidgetDisplay, typing?: string) => void;
  onText: (patch: TextPatch) => void;
}

export function StyleTab({ widget, errorAt, onDisplay, onText }: StyleTabProps) {
  const { type, display } = widget;
  const prefix = `inspector-${widget.id}`;
  const legend: Legend = display.legend ?? { show: true, position: 'bottom' };
  const set = (patch: Partial<WidgetDisplay>, typing?: string) =>
    onDisplay({ ...display, ...patch }, typing);
  const section: StyleSectionProps = { widget, prefix, errorAt, set };

  return (
    <div className={styles.tab}>
      <TextField
        label="Title"
        name={`${prefix}-title`}
        tip="Empty uses the source and measure."
        maxLength={80}
        value={widget.title}
        onChange={(title) => onText({ title })}
        error={errorAt('title')}
      />
      <TextField
        label="Subtitle"
        name={`${prefix}-subtitle`}
        maxLength={120}
        value={widget.subtitle}
        onChange={(subtitle) => onText({ subtitle })}
        error={errorAt('subtitle')}
      />
      {shows(type, 'note') && (
        <TextAreaField
          label="Note"
          name={`${prefix}-note`}
          tip="Plain text, shown as written."
          maxLength={2000}
          rows={6}
          value={widget.note}
          onChange={(note) => onText({ note })}
          error={errorAt('note')}
        />
      )}
      {shows(type, 'palette') && (
        <RadioGroup
          label="Colours"
          name={`${prefix}-palette`}
          options={PALETTES.map((palette) => ({
            value: palette.value,
            label: (
              <span className={styles.paletteChoice}>
                {palette.label}
                <span className={styles.swatches} aria-hidden="true">
                  {palette.tokens.map((token) => (
                    <span
                      key={token}
                      className={styles.swatch}
                      style={{ backgroundColor: `var(${token})` }}
                    />
                  ))}
                </span>
              </span>
            ),
          }))}
          value={display.palette ?? defaultPalette(type)}
          onChange={(palette) => set({ palette })}
        />
      )}
      {shows(type, 'legend') && (
        <div className={styles.pair}>
          <CheckboxField
            label="Show the legend"
            name={`${prefix}-legend`}
            checked={legend.show}
            onChange={(show) => set({ legend: { ...legend, show } })}
          />
          <ChoiceField
            label="Legend position"
            name={`${prefix}-legend-position`}
            value={legend.position}
            options={choices(LEGEND_POSITIONS)}
            onChange={(value) => {
              const position = LEGEND_POSITIONS.find((each) => each.value === value)?.value;
              set({ legend: { ...legend, position: position ?? 'bottom' } });
            }}
            placeholder={null}
          />
        </div>
      )}
      {shows(type, 'dataLabels') && (
        <CheckboxField
          label="Data labels"
          name={`${prefix}-data-labels`}
          checked={display.dataLabels ?? defaultDataLabels(type)}
          onChange={(dataLabels) => set({ dataLabels })}
        />
      )}
      <StyleAxes {...section} />
      <StyleValues {...section} />
    </div>
  );
}
