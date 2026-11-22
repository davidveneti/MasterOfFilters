/** Dark/light theme: sets data-theme on <html> and persists the choice. */
export class ThemeManager {
  /** @param {import('../storage/ProgressStore.js').ProgressStore} store */
  constructor(store) {
    this.store = store;
    this.theme = store.getPref('theme') === 'light' ? 'light' : 'dark';
    this.apply();
  }
  apply() {
    document.documentElement.dataset.theme = this.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', this.theme === 'light' ? '#f3f4f7' : '#000000');
  }
  toggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.store.setPref('theme', this.theme);
    this.apply();
    return this.theme;
  }
}
