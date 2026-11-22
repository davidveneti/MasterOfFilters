/** Settings panel: per-filter controls (built from the filter's schema) + global controls. */

function fmt(def, v) { return Number(v).toFixed(def.digits ?? 2); }

function buildControl(def, obj, onChange) {
  const row = document.createElement('div');
  row.className = 'row';

  if (def.type === 'checkbox') {
    const label = document.createElement('label');
    label.className = 'check';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!obj[def.key];
    cb.addEventListener('change', () => { obj[def.key] = cb.checked; onChange(def.key, cb.checked); });
    label.append(cb, document.createTextNode(def.label));
    row.append(label);
    return row;
  }

  const label = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = def.label;
  const val = document.createElement('span');
  val.className = 'val';
  label.append(name, val);
  const input = document.createElement('input');

  if (def.type === 'color') {
    input.type = 'color';
    input.value = obj[def.key];
    val.textContent = obj[def.key];
    input.addEventListener('input', () => {
      obj[def.key] = input.value;
      val.textContent = input.value;
      onChange(def.key, input.value);
    });
  } else {
    input.type = 'range';
    input.min = def.min; input.max = def.max; input.step = def.step;
    input.value = obj[def.key];
    val.textContent = fmt(def, obj[def.key]);
    input.addEventListener('input', () => {
      obj[def.key] = parseFloat(input.value);
      val.textContent = fmt(def, obj[def.key]);
      onChange(def.key, obj[def.key]);
    });
  }
  row.append(label, input);
  return row;
}

export const GLOBAL_SCHEMA = [
  { key: 'mouthThreshold', label: 'Mouth Threshold', type: 'range', min: 0.01, max: 0.1, step: 0.0025, digits: 3 },
  { key: 'debug', label: 'Toggle Debug', type: 'checkbox' },
];

export class SettingsPanel {
  /**
   * @param globals live global settings object
   * @param cb { onGlobal(key), onFilter(key, value), onReset() }
   */
  constructor(root, globals, cb) {
    this.globals = globals;
    this.cb = cb;
    root.innerHTML = '';

    const gear = document.createElement('button');
    gear.className = 'gear'; gear.type = 'button';
    gear.setAttribute('aria-label', 'Settings');
    gear.textContent = '⚙';
    this.panel = document.createElement('div');
    this.panel.className = 'panel';
    gear.addEventListener('click', () => this.panel.classList.toggle('open'));

    this.title = document.createElement('h3');
    this.filterBox = document.createElement('div');
    const h2 = document.createElement('h3');
    h2.textContent = 'Global';
    h2.className = 'sub';
    this.globalBox = document.createElement('div');
    for (const def of GLOBAL_SCHEMA) {
      this.globalBox.append(buildControl(def, globals, (k) => cb.onGlobal(k)));
    }
    this.reset = document.createElement('button');
    this.reset.className = 'reset'; this.reset.type = 'button';
    this.reset.textContent = 'Reset filter settings';

    this.panel.append(this.title, this.filterBox, h2, this.globalBox, this.reset);
    root.append(gear, this.panel);
  }

  /** Rebuild the filter section for the newly active filter. */
  setFilter(meta, schema, settings) {
    this.title.textContent = `${meta.icon} ${meta.name}`;
    this.filterBox.innerHTML = '';
    for (const def of schema) {
      this.filterBox.append(buildControl(def, settings, (k, v) => this.cb.onFilter(k, v)));
    }
    this.reset.onclick = () => { this.cb.onReset(); this.setFilter(meta, schema, settings); };
  }
}
