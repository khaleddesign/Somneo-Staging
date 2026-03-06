export interface ReportTemplateData {
  studyType: 'PSG' | 'PV' | 'MSLT' | 'MWT'
  patientReference: string
  agentName: string
  generatedAt: string
  values: Record<string, Record<string, string>>
}

type BadgeType = 'ok' | 'warn' | 'mod' | 'bad' | 'neutral'

// ─── helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Lire une valeur depuis plusieurs IDs de section possibles */
function v(
  values: Record<string, Record<string, string>>,
  sections: string[],
  key: string,
  unit = '',
): string {
  for (const s of sections) {
    const val = values[s]?.[key]
    if (val !== undefined && val !== '') return `${esc(val)}${unit ? `\u00a0${unit}` : ''}`
  }
  return '—'
}

/** Lire une valeur numérique */
function num(
  values: Record<string, Record<string, string>>,
  sections: string[],
  key: string,
): number | null {
  for (const s of sections) {
    const val = values[s]?.[key]
    if (val !== undefined && val !== '') {
      const n = parseFloat(val)
      return isNaN(n) ? null : n
    }
  }
  return null
}

// ─── badges ───────────────────────────────────────────────────────────────────

const BADGE: Record<BadgeType, { bg: string; color: string; label: string }> = {
  ok:      { bg: '#dcfce7', color: '#14532d', label: 'Normal'  },
  warn:    { bg: '#fef9c3', color: '#713f12', label: 'Limite'  },
  mod:     { bg: '#ffedd5', color: '#7c2d12', label: 'Modéré'  },
  bad:     { bg: '#fee2e2', color: '#7f1d1d', label: 'Élevé'   },
  neutral: { bg: '#f1f5f9', color: '#475569', label: '—'       },
}

function badge(type: BadgeType, label?: string): string {
  const c = BADGE[type]
  const lbl = label ?? c.label
  return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;font-family:'DM Sans',Arial,sans-serif;background:${c.bg};color:${c.color};letter-spacing:0.3px;white-space:nowrap">${lbl}</span>`
}

// ─── classification par valeur ─────────────────────────────────────────────────

function iahType(n: number | null): BadgeType {
  if (n === null) return 'neutral'
  if (n < 5)  return 'ok'
  if (n < 15) return 'warn'
  if (n < 30) return 'mod'
  return 'bad'
}

function effType(n: number | null): BadgeType {
  if (n === null) return 'neutral'
  if (n >= 85) return 'ok'
  if (n >= 75) return 'warn'
  return 'bad'
}

function latencyType(n: number | null): BadgeType {
  if (n === null) return 'neutral'
  if (n < 20)  return 'ok'
  if (n <= 30) return 'warn'
  return 'bad'
}

function arousalType(n: number | null): BadgeType {
  if (n === null) return 'neutral'
  if (n < 10)  return 'ok'
  if (n < 15)  return 'warn'
  return 'bad'
}

function apneaDurType(n: number | null): BadgeType {
  if (n === null) return 'neutral'
  if (n < 30)  return 'ok'
  if (n < 60)  return 'warn'
  return 'bad'
}

function spo2MeanType(n: number | null): BadgeType {
  if (n === null) return 'neutral'
  if (n >= 95) return 'ok'
  if (n >= 90) return 'warn'
  return 'bad'
}

function spo2MinType(n: number | null): BadgeType {
  if (n === null) return 'neutral'
  if (n > 88)  return 'ok'
  if (n >= 80) return 'warn'
  return 'bad'
}

function ct90Type(n: number | null): BadgeType {
  if (n === null) return 'neutral'
  if (n < 1)  return 'ok'
  if (n < 10) return 'warn'
  return 'bad'
}

function timeUnder88Type(n: number | null): BadgeType {
  if (n === null) return 'neutral'
  if (n < 1) return 'ok'
  if (n < 5) return 'warn'
  return 'bad'
}

// ─── sévérité IAH ─────────────────────────────────────────────────────────────

interface Severity {
  label: string
  textColor: string
  accentColor: string
  chipBg: string
  chipBorder: string
}

function severityFromIah(iah: number | null): Severity {
  if (iah === null || iah < 5) return {
    label: 'Normal',
    textColor: '#14532d',
    accentColor: '#22c55e',
    chipBg: '#dcfce7',
    chipBorder: '#86efac',
  }
  if (iah < 15) return {
    label: 'SAOS Léger',
    textColor: '#713f12',
    accentColor: '#eab308',
    chipBg: '#fef9c3',
    chipBorder: '#fde047',
  }
  if (iah < 30) return {
    label: 'SAOS Modéré',
    textColor: '#7c2d12',
    accentColor: '#f97316',
    chipBg: '#ffedd5',
    chipBorder: '#fdba74',
  }
  return {
    label: 'SAOS Sévère',
    textColor: '#7f1d1d',
    accentColor: '#ef4444',
    chipBg: '#fee2e2',
    chipBorder: '#fca5a5',
  }
}

// ─── composants HTML ──────────────────────────────────────────────────────────

function tableRow(param: string, value: string, norm: string, bdg: string): string {
  return `
        <tr>
          <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#334155">${param}</td>
          <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-family:'Syne',Arial,sans-serif;font-size:12px;font-weight:600;color:#0f172a;text-align:center">${value}</td>
          <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#94a3b8;text-align:center">${norm}</td>
          <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;text-align:center">${bdg}</td>
        </tr>`
}

function metricsTable(title: string, rows: string): string {
  return `
    <div style="margin-bottom:22px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:3px;height:18px;background:#1ec8d4;border-radius:2px;flex-shrink:0"></div>
        <span style="font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;color:#06111f;text-transform:uppercase;letter-spacing:1.2px">${title}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:white">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:8px 14px;text-align:left;font-family:'Syne',Arial,sans-serif;font-size:9.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #e2e8f0;width:40%">Paramètre</th>
            <th style="padding:8px 14px;text-align:center;font-family:'Syne',Arial,sans-serif;font-size:9.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #e2e8f0;width:18%">Valeur</th>
            <th style="padding:8px 14px;text-align:center;font-family:'Syne',Arial,sans-serif;font-size:9.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #e2e8f0;width:22%">Norme AASM</th>
            <th style="padding:8px 14px;text-align:center;font-family:'Syne',Arial,sans-serif;font-size:9.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #e2e8f0;width:20%">Statut</th>
          </tr>
        </thead>
        <tbody>${rows}
        </tbody>
      </table>
    </div>`
}

// ─── template principal ───────────────────────────────────────────────────────

const STUDY_TYPE_LABEL: Record<string, string> = {
  PSG:  'Polysomnographie Complète',
  PV:   'Polygraphie Ventilatoire',
  MSLT: 'Test de Latence Multiples Endormissements',
  MWT:  'Test de Maintien de l\'Éveil',
}

export function buildReportHtml(data: ReportTemplateData): string {
  const { studyType, patientReference, agentName, generatedAt, values } = data

  // Alias sections (accept both EN and FR keys)
  const SLEEP = ['sommeil', 'sleep', 'sleep_architecture', 'architecture']
  const RESP  = ['respiratoire', 'respiratory', 'respiration']
  const OXY   = ['oximetrie', 'oxymetry', 'oximetry', 'saturation']
  const CONC  = ['conclusion']

  // IAH + severity
  const iahN = num(values, RESP, 'iah')
  const sev  = severityFromIah(iahN)

  // Technical notes (optional section)
  const techText = (values.technical?.text ?? '').trim()

  // Conclusion
  const conclusionText = (
    values[CONC[0]]?.richtext ??
    values[CONC[0]]?.text ??
    ''
  ).trim()

  // ── Sleep architecture rows
  const sleepRows = [
    tableRow('Temps au lit',            v(values, SLEEP, 'temps_lit', 'min'),              '—',            badge('neutral')),
    tableRow('Temps de sommeil total',  v(values, SLEEP, 'temps_sommeil', 'min'),          '&gt; 360 min', badge(num(values, SLEEP, 'temps_sommeil') !== null && num(values, SLEEP, 'temps_sommeil')! >= 360 ? 'ok' : 'warn')),
    tableRow('Efficacité du sommeil',   v(values, SLEEP, 'efficacite', '%'),               '≥ 85 %',       badge(effType(num(values, SLEEP, 'efficacite')))),
    tableRow("Latence d'endormissement", v(values, SLEEP, 'latence_endormissement', 'min'), '&lt; 30 min',  badge(latencyType(num(values, SLEEP, 'latence_endormissement')))),
    tableRow("Index d'éveil",           v(values, SLEEP, 'index_eveil', '/h'),             '&lt; 15 /h',   badge(arousalType(num(values, SLEEP, 'index_eveil')))),
  ].join('')

  // ── Respiratory rows
  const respRows = [
    tableRow('IAH Total',                  v(values, RESP, 'iah', '/h'),             '&lt; 5 /h',  badge(iahType(iahN))),
    tableRow('IAH (position dorsale)',     v(values, RESP, 'iah_supin', '/h'),       '—',          badge(iahType(num(values, RESP, 'iah_supin')))),
    tableRow('IAH (autres positions)',     v(values, RESP, 'iah_non_supin', '/h'),   '—',          badge(iahType(num(values, RESP, 'iah_non_supin')))),
    tableRow('IAH REM',                    v(values, RESP, 'iah_rem', '/h'),         '—',          badge(iahType(num(values, RESP, 'iah_rem')))),
    tableRow('IAH NREM',                   v(values, RESP, 'iah_nrem', '/h'),        '—',          badge(iahType(num(values, RESP, 'iah_nrem')))),
    tableRow("Durée apnée la plus longue", v(values, RESP, 'longest_apnea_sec', 'sec'), '&lt; 30 sec', badge(apneaDurType(num(values, RESP, 'longest_apnea_sec')))),
  ].join('')

  // ── Oximetry rows
  const oxyRows = [
    tableRow('SpO₂ moyenne nocturne',    v(values, OXY, 'spo2_moyenne', '%'),    '≥ 95 %',     badge(spo2MeanType(num(values, OXY, 'spo2_moyenne')))),
    tableRow('SpO₂ minimale',            v(values, OXY, 'spo2_min', '%'),        '&gt; 88 %',  badge(spo2MinType(num(values, OXY, 'spo2_min')))),
    tableRow('Temps &lt; 90 % SpO₂ (CT90)', v(values, OXY, 'ct90', '%'),         '&lt; 1 %',   badge(ct90Type(num(values, OXY, 'ct90')))),
    tableRow('SpO₂ de base (éveil)',     v(values, OXY, 'spo2_base_awake', '%'), '≥ 95 %',     badge(spo2MeanType(num(values, OXY, 'spo2_base_awake')))),
    tableRow('Temps passé &lt; 88 % SpO₂', v(values, OXY, 'time_under_88', '%'), '&lt; 1 %',   badge(timeUnder88Type(num(values, OXY, 'time_under_88')))),
  ].join('')

  const iahDisplay = iahN !== null ? iahN.toFixed(1) : '—'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport ${esc(patientReference)} — SOMNOVENTIS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Syne:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', Arial, sans-serif;
      background: white;
      color: #1e293b;
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: white;
      display: flex;
      flex-direction: column;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ═══ HEADER ═══ -->
  <div style="background:linear-gradient(135deg,#06111f 0%,#0a1d30 60%,#0d2137 100%);border-top:4px solid #1ec8d4;padding:28px 36px 24px;display:flex;justify-content:space-between;align-items:flex-start">
    <!-- Gauche : branding + type rapport -->
    <div>
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:700;color:#1ec8d4;letter-spacing:-0.5px;line-height:1">
        SomnoConnect
      </div>
      <div style="font-family:'Syne',Arial,sans-serif;font-size:8.5px;font-weight:700;color:#c8a45a;letter-spacing:3.5px;text-transform:uppercase;margin-top:3px">
        BY SOMNOVENTIS
      </div>
      <div style="margin-top:16px;font-family:'Syne',Arial,sans-serif;font-size:10px;font-weight:700;color:#1ec8d4;text-transform:uppercase;letter-spacing:1.5px">
        ${esc(STUDY_TYPE_LABEL[studyType] ?? studyType)}
      </div>
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:600;color:#f0e8d6;margin-top:2px;line-height:1.2">
        Compte-Rendu Médical du Sommeil
      </div>
    </div>
    <!-- Droite : réf + date -->
    <div style="text-align:right">
      <div style="font-family:'Syne',Arial,sans-serif;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">
        Référence patient
      </div>
      <div style="font-family:'Syne',Arial,sans-serif;font-size:18px;font-weight:700;color:#f0e8d6;letter-spacing:1.5px">
        ${esc(patientReference)}
      </div>
      <div style="margin-top:12px;font-family:'Syne',Arial,sans-serif;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">
        Date de génération
      </div>
      <div style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;font-weight:500;color:#cbd5e1">
        ${esc(generatedAt)}
      </div>
    </div>
  </div>

  <!-- ═══ CONTENT ═══ -->
  <div style="padding:24px 36px;flex:1">

    <!-- ── Chips ── -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;align-items:center">
      <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 13px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:500;color:#1d4ed8">
        <span style="width:6px;height:6px;border-radius:50%;background:#3b82f6;flex-shrink:0"></span>
        Type&nbsp;: ${esc(studyType)}
      </span>
      <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 13px;background:${sev.chipBg};border:1px solid ${sev.chipBorder};border-radius:20px;font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:600;color:${sev.textColor}">
        <span style="width:6px;height:6px;border-radius:50%;background:${sev.accentColor};flex-shrink:0"></span>
        ${esc(sev.label)}
      </span>
      <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 13px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:500;color:#14532d">
        <span style="width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0"></span>
        Validé par&nbsp;: ${esc(agentName)}
      </span>
    </div>

    <!-- ── Info grid 2 colonnes ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px">
        <div style="font-family:'Syne',Arial,sans-serif;font-size:9px;font-weight:700;color:#1ec8d4;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">
          Informations Patient
        </div>
        <div style="display:flex;flex-direction:column;gap:7px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#64748b">Référence</span>
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:600;color:#0f172a">${esc(patientReference)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#64748b">Type d'examen</span>
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:600;color:#0f172a">${esc(studyType)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#64748b">Date du rapport</span>
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:600;color:#0f172a">${esc(generatedAt)}</span>
          </div>
        </div>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px">
        <div style="font-family:'Syne',Arial,sans-serif;font-size:9px;font-weight:700;color:#1ec8d4;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">
          Équipe &amp; Prescription
        </div>
        <div style="display:flex;flex-direction:column;gap:7px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#64748b">Technicien(ne)</span>
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:600;color:#0f172a">${esc(agentName)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#64748b">Centre</span>
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:600;color:#0f172a">SOMNOVENTIS</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#64748b">Statut</span>
            ${badge('ok', 'Validé ✓')}
          </div>
        </div>
      </div>
    </div>

    <!-- ── Bloc sévérité IAH (midnight) ── -->
    <div style="background:linear-gradient(135deg,#06111f 0%,#0d2137 100%);border-radius:12px;padding:20px 28px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;border-left:4px solid ${sev.accentColor}">
      <div>
        <div style="font-family:'Syne',Arial,sans-serif;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">
          Index Apnées-Hypopnées (IAH)
        </div>
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-family:'Syne',Arial,sans-serif;font-size:56px;font-weight:700;color:#f0e8d6;line-height:1">
            ${esc(iahDisplay)}
          </span>
          <span style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:#64748b;padding-bottom:8px">
            /heure
          </span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:'Syne',Arial,sans-serif;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px">
          Classification AASM
        </div>
        <div style="display:inline-block;padding:10px 22px;border-radius:24px;background:${sev.chipBg};border:2px solid ${sev.accentColor}">
          <span style="font-family:'Syne',Arial,sans-serif;font-size:15px;font-weight:700;color:${sev.textColor}">
            ${esc(sev.label)}
          </span>
        </div>
      </div>
    </div>

    <!-- ── Tableaux métriques ── -->
    ${metricsTable('Architecture du Sommeil', sleepRows)}
    ${metricsTable('Analyse Respiratoire', respRows)}
    ${metricsTable('Analyse Oxymétrique', oxyRows)}

    <!-- ── Notes techniques (si renseignées) ── -->
    ${techText ? `
    <div style="margin-bottom:22px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:3px;height:18px;background:#f59e0b;border-radius:2px;flex-shrink:0"></div>
        <span style="font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;color:#06111f;text-transform:uppercase;letter-spacing:1.2px">Notes Techniques</span>
      </div>
      <div style="background:#fefce8;border:1px solid #fde047;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px">
        <p style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#713f12;line-height:1.6;white-space:pre-wrap">${esc(techText)}</p>
      </div>
    </div>` : ''}

    <!-- ── Conclusion ── -->
    <div style="margin-bottom:26px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:3px;height:18px;background:#1ec8d4;border-radius:2px;flex-shrink:0"></div>
        <span style="font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;color:#06111f;text-transform:uppercase;letter-spacing:1.2px">Conclusion &amp; Recommandations</span>
      </div>
      <div style="border-left:3px solid #1ec8d4;border:1px solid #a5f3fc;border-left:3px solid #1ec8d4;border-radius:0 10px 10px 0;padding:16px 20px;background:#f0fdfe">
        <p style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#0f172a;line-height:1.75;white-space:pre-wrap">${conclusionText ? esc(conclusionText) : '<span style="color:#94a3b8;font-style:italic">Aucune conclusion renseignée.</span>'}</p>
      </div>
    </div>

    <!-- ── Signatures ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:10px">
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:20px 18px;text-align:center">
        <div style="font-family:'Syne',Arial,sans-serif;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:36px">
          Technicien(ne) polysomnographe
        </div>
        <div style="border-top:1.5px solid #1ec8d4;padding-top:8px">
          <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:14px;font-weight:600;color:#0f172a">${esc(agentName)}</span>
        </div>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:20px 18px;text-align:center">
        <div style="font-family:'Syne',Arial,sans-serif;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:36px">
          Médecin prescripteur
        </div>
        <div style="border-top:1.5px solid #e2e8f0;padding-top:8px">
          <span style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#94a3b8;font-style:italic">Signature à apposer</span>
        </div>
      </div>
    </div>

  </div><!-- /content -->

  <!-- ═══ FOOTER ═══ -->
  <div style="background:#06111f;border-top:2px solid #1ec8d4;padding:10px 36px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;color:#475569">
      Réf. patient&nbsp;: <strong style="color:#94a3b8">${esc(patientReference)}</strong>
      &nbsp;·&nbsp; Généré le ${esc(generatedAt)}
      &nbsp;·&nbsp; Confidentiel — usage médical exclusif
    </span>
    <span style="font-family:'Syne',Arial,sans-serif;font-size:10px;font-weight:700;color:#c8a45a;letter-spacing:1.5px;text-transform:uppercase">
      SOMNOVENTIS · Page 1
    </span>
  </div>

</div><!-- /page -->
</body>
</html>`
}
