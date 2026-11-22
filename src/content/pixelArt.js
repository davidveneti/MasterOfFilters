/**
 * Original 8x8 pixel-art icons in a "blocky" style, drawn in code (no game assets are used).
 * Each icon: `pal` maps a character to a color; '.' is transparent; `rows` are 8 strings of 8 chars.
 * Riddles reference them as tokens "px:<name>".
 */
export const ICONS = {
  creeper: { pal: { g: '#5cb338', G: '#3f8a26', k: '#0e140e' }, rows: [
    'gGggggGg', 'gkkggkkg', 'gkkggkkg', 'gggkkggg', 'ggkkkkgg', 'ggkggkgg', 'gGgggGgg', 'ggGgggGg'] },
  enderman: { pal: { k: '#0d0d12', K: '#1b1b24', p: '#d27bff', P: '#f3d1ff' }, rows: [
    'kkkkkkkk', 'kKkkkkKk', 'kkkkkkkk', 'kpPkkPpk', 'kkkkkkkk', 'kKkkkKkk', 'kkkkkkkk', 'kkkkkkkk'] },
  zombie: { pal: { g: '#4a8f43', G: '#35692f', k: '#142014' }, rows: [
    'GGGGGGGG', 'gGgggGgg', 'gkkggkkg', 'gggkkggg', 'ggkkkkgg', 'gggggggg', 'gGggggGg', 'gggGgggg'] },
  planks: { pal: { b: '#b8884d', d: '#8a6234' }, rows: [
    'bbbbbbbb', 'dddddddd', 'bbbbbbbb', 'bbbbbbbb', 'dddddddd', 'bbbbbbbb', 'bbbbbbbb', 'dddddddd'] },
  cobble: { pal: { g: '#8a8a8a', D: '#5a5a5a', l: '#a9a9a9' }, rows: [
    'gggDgggg', 'gglgDggg', 'DDDDgglg', 'gllgDDDD', 'gggDgggl', 'lgggDggg', 'DDDDDDgg', 'gglgDggg'] },
  grass: { pal: { g: '#5aa83a', G: '#46872c', d: '#8a5a36', D: '#6b4226' }, rows: [
    'gggggggg', 'gGgggGgg', 'dgdgdgdd', 'dddddddd', 'dDddddDd', 'dddddddd', 'ddDddddd', 'dddddDdd'] },
  dirt: { pal: { d: '#8a5a36', D: '#6b4226', l: '#a06b43' }, rows: [
    'dddDdddd', 'dldddDdd', 'dddddddl', 'Dddldddd', 'dddddDdd', 'dldddddd', 'dddDdldd', 'ddddddDd'] },
  diamond: { pal: { c: '#1fa6b8', C: '#6ee7f2', w: '#ffffff' }, rows: [
    '..cccc..', '.cCCCCc.', 'cCwCCCCc', 'cCCCCCCc', '.cCCCCc.', '..cCCc..', '...cc...', '........'] },
  emerald: { pal: { c: '#0f8f3d', C: '#4fe07f', w: '#d9ffe5' }, rows: [
    '..cccc..', '.cCCCCc.', 'cCwCCCCc', 'cCCCCCCc', '.cCCCCc.', '..cCCc..', '...cc...', '........'] },
  iron: { pal: { l: '#f0f0f0', I: '#cfcfcf', d: '#8f8f8f' }, rows: [
    '........', '..llll..', '.lIIIIl.', 'lIIIIIIl', 'lIIIIIId', '.dddddd.', '........', '........'] },
  gold: { pal: { l: '#fff4b0', I: '#f7c93a', d: '#c58f14' }, rows: [
    '........', '..llll..', '.lIIIIl.', 'lIIIIIIl', 'lIIIIIId', '.dddddd.', '........', '........'] },
  coal: { pal: { k: '#1f1f1f', K: '#4a4a4a' }, rows: [
    '........', '..kkk...', '.kKkkk..', '.kkkKk..', '..kkkkk.', '.kKkkkk.', '..kkkk..', '........'] },
  redstone: { pal: { r: '#c01818', R: '#ff4040', d: '#6e0b0b' }, rows: [
    '........', '..rR.rr.', '.rrrRrrr', '.rRrrrRr', '..rrRrr.', '.rrr.rr.', '..dd.dd.', '........'] },
  tnt: { pal: { r: '#d13b2f', R: '#9e2219', w: '#e8e8e8', k: '#222222' }, rows: [
    'rrrrrrrr', 'rRrrrrRr', 'wwwwwwww', 'wkwkwkwk', 'wwwwwwww', 'rrrrrrrr', 'rRrrrrRr', 'RRRRRRRR'] },
  table: { pal: { D: '#5a3a1e', b: '#b8884d' }, rows: [
    'DDDDDDDD', 'DbbDbbbD', 'DbbDbbbD', 'DDDDDDDD', 'DbbDbbbD', 'DbbDbbbD', 'DDDDDDDD', 'bbbbbbbb'] },
  furnace: { pal: { g: '#8a8a8a', D: '#4a4a4a', l: '#a9a9a9', o: '#ff9a1f', y: '#ffe066', k: '#1a1a1a' }, rows: [
    'gggggggg', 'gDDDDDDg', 'gDkkkkDg', 'gDkoykDg', 'gDkyokDg', 'gDDDDDDg', 'gggggggg', 'lllllllg'] },
  chest: { pal: { D: '#5a3a1e', b: '#a8742f', l: '#e8d27a', k: '#2a1a0c' }, rows: [
    'DDDDDDDD', 'DbbbbbbD', 'DbbbbbbD', 'DDDllDDD', 'DbbkkbbD', 'DbbbbbbD', 'DbbbbbbD', 'DDDDDDDD'] },
  torch: { pal: { y: '#ffe066', o: '#ff9a1f', b: '#8a5a36', B: '#5a3a1e' }, rows: [
    '...yy...', '..yooy..', '...oo...', '...bb...', '...bB...', '...bb...', '...bB...', '...bb...'] },
  stick: { pal: { b: '#a8742f', B: '#7a5020' }, rows: [
    '.......b', '......bB', '.....bB.', '....bB..', '...bB...', '..bB....', '.bB.....', 'bB......'] },
  obsidian: { pal: { k: '#14101e', K: '#2d2147', p: '#6a3fb0' }, rows: [
    'kkkkkkkk', 'kKkkkpkk', 'kkkkkkKk', 'kpkkKkkk', 'kkkkkkkk', 'kKkkkkpk', 'kkpkkKkk', 'kkkkkkkk'] },
  pearl: { pal: { t: '#0f6b5a', T: '#2fb59d', w: '#c8fff2' }, rows: [
    '........', '..tttt..', '.tTTTTt.', 'tTTwwTTt', 'tTTwTTTt', '.tTTTTt.', '..tttt..', '........'] },
  blazerod: { pal: { y: '#ffcc33', o: '#ff8a1f', d: '#b35a0a' }, rows: [
    '......yy', '.....yoy', '....yoy.', '...yoy..', '..yod...', '.yod....', 'yod.....', 'dd......'] },
  netherite: { pal: { k: '#3a2f2a', K: '#5a4a42', d: '#241c18' }, rows: [
    '........', '..KKKK..', '.KkkkkK.', 'KkkkkkkK', 'Kkkkkkkd', '.dddddd.', '........', '........'] },
  sand: { pal: { s: '#e3d79c', S: '#c9bb7a', l: '#f2eab9' }, rows: [
    'ssssSsss', 'sslssssS', 'ssssssss', 'Sssslsss', 'sssssSss', 'slssssss', 'ssssSsls', 'ssssssss'] },
  gunpowder: { pal: { g: '#6e6e6e', G: '#3e3e3e', l: '#9a9a9a' }, rows: [
    '........', '..G.gg..', '.gGgGlg.', '.GgglGg.', '..gGgg..', '.lgGggG.', '..gg.gl.', '........'] },
  ironblock: { pal: { l: '#e8e8e8', I: '#cfcfcf', d: '#a0a0a0' }, rows: [
    'llllllll', 'lIIIIIId', 'lIIIIIId', 'lIIIIIId', 'lIIIIIId', 'lIIIIIId', 'lIIIIIId', 'dddddddd'] },
};

/** Validate the icon set (used by tests): 8 rows of 8 chars, every char is '.' or in the palette. */
export function validateIcons() {
  const errors = [];
  for (const [name, { pal, rows }] of Object.entries(ICONS)) {
    if (rows.length !== 8) errors.push(`${name}: ${rows.length} rows`);
    rows.forEach((r, i) => {
      if (r.length !== 8) errors.push(`${name}: row ${i} has ${r.length} chars`);
      for (const ch of r) if (ch !== '.' && !pal[ch]) errors.push(`${name}: row ${i} uses undefined color "${ch}"`);
    });
  }
  return errors;
}
