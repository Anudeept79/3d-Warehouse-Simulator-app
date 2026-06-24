/**
 * Alerts feed + rotating AI insights panel.
 */
import { incident } from '../state.js';
import { INSIGHTS } from '../config.js';

let alertN = 0;

export function addAlert(sev, msg) {
  const list = document.getElementById('alertList');
  const el = document.createElement('div'); el.className = 'al ' + sev;
  const t = document.getElementById('clockVal').textContent.slice(0, 5);
  el.innerHTML = `<span class="t">${t}</span><span class="sev"></span><span class="m">${msg}</span>`;
  list.prepend(el);
  while (list.children.length > 5) list.lastChild.remove();
  alertN++;
  const crits = incident.active ? 1 : 0;
  document.getElementById('alCount').textContent = crits ? '1 CRITICAL' : `${Math.min(alertN, 3)} active`;
}

let insT = 2, insI = 0;

export function pushInsight() {
  const [ic, msg] = INSIGHTS[insI++ % INSIGHTS.length];
  const list = document.getElementById('aiList');
  const el = document.createElement('div'); el.className = 'ins';
  el.innerHTML = `<span class="ic">${ic}</span><span>${msg}</span>`;
  list.prepend(el);
  while (list.children.length > 3) list.lastChild.remove();
}

export function tickInsights(dt) {
  insT -= dt;
  if (insT < 0) { insT = 11; pushInsight(); }
}
