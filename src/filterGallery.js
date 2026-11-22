/** Bottom filter selector: horizontally scrollable on mobile, centered on desktop. */
export class FilterGallery {
  constructor(root, manager) {
    this.root = root;
    this.manager = manager;
    this.buttons = new Map();
    root.innerHTML = '';
    root.setAttribute('role', 'listbox');
    root.setAttribute('aria-label', 'AR filters');

    this.track = document.createElement('div');
    this.track.className = 'gallery-track';
    const metas = manager.list();
    metas.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fbtn';
      b.dataset.id = m.id;
      b.title = `${m.description}  [${i + 1}]`;
      b.setAttribute('role', 'option');
      b.setAttribute('aria-label', m.name);
      const icon = document.createElement('span');
      icon.className = 'ficon';
      icon.textContent = m.icon;
      const name = document.createElement('span');
      name.className = 'fname';
      name.textContent = m.name;
      b.append(icon, name);
      b.addEventListener('click', () => manager.activate(m.id));
      this.track.append(b);
      this.buttons.set(m.id, b);
    });
    root.append(this.track);

    manager.on('change', () => this.sync());
    this._onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const ids = metas.map((m) => m.id);
      const cur = ids.indexOf(manager.activeId);
      if (e.key >= '1' && e.key <= String(ids.length)) manager.activate(ids[Number(e.key) - 1]);
      else if (e.key === 'ArrowRight') manager.activate(ids[(cur + 1) % ids.length]);
      else if (e.key === 'ArrowLeft') manager.activate(ids[(cur - 1 + ids.length) % ids.length]);
    };
    document.addEventListener('keydown', this._onKey);
  }

  sync() {
    for (const [id, b] of this.buttons) {
      const on = id === this.manager.activeId;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
      if (on) {
        const left = b.offsetLeft - (this.root.clientWidth - b.offsetWidth) / 2;
        this.root.scrollTo({ left, behavior: 'smooth' });
      }
    }
  }
}
