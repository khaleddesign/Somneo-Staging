import React from 'react'
import path from 'path'
import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

type ReportRowStatus = 'ok' | 'warn' | 'bad' | 'mod'

interface ReportRecord {
  id?: string
  content?: unknown
  template_data?: unknown
}

interface StudyRecord {
  id?: string
  study_type?: string
  patient_reference?: string
  prescription_doctor?: string | null
  prescription_date?: string | null
}

interface ReportPDFProps {
  report: ReportRecord
  study: StudyRecord
  agentName?: string
  generatedAt?: string
}

interface ReportMetric {
  label: string
  value: string
  norm: string
  status: ReportRowStatus
}

const colors = {
  midnight: '#06111f',
  teal: '#1ec8d4',
  slate: '#7a8a99',
  light: '#f0f4f8',
  border: '#dbe4ec',
  text: '#1f2a37',
  white: '#ffffff',
  okBg: '#dcfce7',
  okText: '#166534',
  warnBg: '#fef3c7',
  warnText: '#92400e',
  badBg: '#fee2e2',
  badText: '#991b1b',
  modBg: '#e0e7ff',
  modText: '#3730a3',
}

Font.register({
  family: 'Syne',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Syne-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public/fonts/Syne-SemiBold.ttf'), fontWeight: 600 },
    { src: path.join(process.cwd(), 'public/fonts/Syne-Bold.ttf'), fontWeight: 700 },
  ],
})

Font.register({
  family: 'DMSans',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/DMSans-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public/fonts/DMSans-Medium.ttf'), fontWeight: 500 },
  ],
})

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 42,
    paddingHorizontal: 28,
    fontFamily: 'DMSans',
    fontSize: 10,
    color: colors.text,
  },
  header: {
    backgroundColor: colors.midnight,
    borderTopWidth: 4,
    borderTopColor: colors.teal,
    marginHorizontal: -28,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'Syne',
    fontWeight: 700,
  },
  brandSub: {
    color: '#a8bccd',
    fontSize: 8,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  reportType: {
    color: colors.white,
    fontFamily: 'Syne',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'right',
  },
  reportRef: {
    color: '#b8c7d8',
    fontSize: 8,
    marginTop: 4,
    textAlign: 'right',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipLabel: {
    fontSize: 8,
    color: colors.slate,
  },
  chipValue: {
    fontSize: 9,
    fontFamily: 'Syne',
    fontWeight: 600,
    color: colors.midnight,
    marginTop: 1,
  },
  grid2: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: colors.white,
  },
  cardTitle: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.slate,
    marginBottom: 7,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowKey: {
    fontSize: 9,
    color: colors.slate,
  },
  rowValue: {
    fontSize: 9,
    color: colors.midnight,
    fontFamily: 'Syne',
    fontWeight: 600,
  },
  severityBlock: {
    backgroundColor: colors.midnight,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityLabel: {
    color: '#9db5c8',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  severityText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: 'Syne',
    fontWeight: 700,
    marginTop: 2,
  },
  iahValue: {
    fontFamily: 'Syne',
    fontSize: 48,
    fontWeight: 700,
    color: colors.teal,
    lineHeight: 1,
  },
  tableSection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  tableTitle: {
    backgroundColor: colors.light,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: colors.midnight,
    fontFamily: 'Syne',
    fontWeight: 700,
    fontSize: 10,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  th: {
    fontSize: 8,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  colParam: { width: '38%' },
  colValue: { width: '20%' },
  colNorm: { width: '25%' },
  colBadge: { width: '17%', textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f6',
    alignItems: 'center',
  },
  tdParam: {
    width: '38%',
    fontSize: 9,
    color: colors.text,
  },
  tdValue: {
    width: '20%',
    fontSize: 10,
    fontFamily: 'Syne',
    fontWeight: 600,
    color: colors.midnight,
  },
  tdNorm: {
    width: '25%',
    fontSize: 9,
    color: colors.slate,
  },
  tdBadgeWrap: {
    width: '17%',
    alignItems: 'flex-end',
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 8,
    fontFamily: 'Syne',
    fontWeight: 600,
  },
  conclusion: {
    borderLeftWidth: 4,
    borderLeftColor: colors.teal,
    backgroundColor: colors.light,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: 2,
    marginBottom: 12,
  },
  conclusionTitle: {
    color: colors.midnight,
    fontFamily: 'Syne',
    fontWeight: 700,
    fontSize: 10,
    marginBottom: 4,
  },
  conclusionBody: {
    fontSize: 10,
    lineHeight: 1.5,
    color: colors.text,
  },
  signatures: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  signatureCol: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 8,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 22,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
    fontSize: 9,
    color: colors.midnight,
  },
  footer: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 5,
  },
  footerText: {
    fontSize: 8,
    color: colors.slate,
  },
})

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeValues(raw: unknown): Record<string, Record<string, string>> {
  if (!isObject(raw) || !isObject(raw.values)) return {}

  const output: Record<string, Record<string, string>> = {}
  Object.entries(raw.values).forEach(([sectionId, section]) => {
    if (!isObject(section)) return
    const normalized: Record<string, string> = {}
    Object.entries(section).forEach(([key, value]) => {
      if (typeof value === 'string') normalized[key] = value
      else if (typeof value === 'number') normalized[key] = String(value)
    })
    output[sectionId] = normalized
  })

  return output
}

function parseNumber(value: string): number | null {
  const normalized = value.replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function severityFromIah(iah: number | null): { label: string; status: ReportRowStatus } {
  if (iah === null) return { label: 'Indéterminée', status: 'warn' }
  if (iah < 5) return { label: 'Normale', status: 'ok' }
  if (iah < 15) return { label: 'Légère', status: 'mod' }
  if (iah < 30) return { label: 'Modérée', status: 'warn' }
  return { label: 'Sévère', status: 'bad' }
}

function readMetric(values: Record<string, Record<string, string>>, keys: string[], fallback = '-'): string {
  for (const section of Object.values(values)) {
    for (const key of keys) {
      const hit = section[key]
      if (hit && hit.trim().length > 0) return hit
    }
  }
  return fallback
}

function statusByRange(value: string, min: number, max: number, reverse = false): ReportRowStatus {
  const num = parseNumber(value)
  if (num === null) return 'warn'
  if (!reverse) return num >= min && num <= max ? 'ok' : 'bad'
  return num <= max ? 'ok' : 'bad'
}

function statusText(status: ReportRowStatus): string {
  if (status === 'ok') return 'OK'
  if (status === 'warn') return 'WARN'
  if (status === 'mod') return 'MOD'
  return 'BAD'
}

function badgeStyle(status: ReportRowStatus) {
  if (status === 'ok') return { backgroundColor: colors.okBg, color: colors.okText }
  if (status === 'warn') return { backgroundColor: colors.warnBg, color: colors.warnText }
  if (status === 'mod') return { backgroundColor: colors.modBg, color: colors.modText }
  return { backgroundColor: colors.badBg, color: colors.badText }
}

function MetricTable({ title, rows }: { title: string; rows: ReportMetric[] }) {
  return (
    <View style={styles.tableSection}>
      <Text style={styles.tableTitle}>{title}</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.colParam]}>Paramètre</Text>
        <Text style={[styles.th, styles.colValue]}>Valeur</Text>
        <Text style={[styles.th, styles.colNorm]}>Norme</Text>
        <Text style={[styles.th, styles.colBadge]}>Badge</Text>
      </View>

      {rows.map((row, index) => {
        const badge = badgeStyle(row.status)
        return (
          <View key={`${title}-${index}`} style={styles.tableRow}>
            <Text style={styles.tdParam}>{row.label}</Text>
            <Text style={styles.tdValue}>{row.value}</Text>
            <Text style={styles.tdNorm}>{row.norm}</Text>
            <View style={styles.tdBadgeWrap}>
              <Text style={[styles.badge, badge]}>{statusText(row.status)}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

export function ReportPDF({ report, study, agentName, generatedAt }: ReportPDFProps) {
  const values = normalizeValues(report.content)

  const iahRaw = readMetric(values, ['iah', 'ia_h', 'index_apnee_hypopnee'])
  const iah = parseNumber(iahRaw)
  const severity = severityFromIah(iah)

  const architectureRows: ReportMetric[] = [
    {
      label: 'Efficacité du sommeil',
      value: readMetric(values, ['sleep_efficiency', 'efficacite_sommeil']),
      norm: '> 85 %',
      status: statusByRange(readMetric(values, ['sleep_efficiency', 'efficacite_sommeil']), 85, 100),
    },
    {
      label: 'Latence d’endormissement',
      value: readMetric(values, ['sleep_latency', 'latence_endormissement']),
      norm: '10–30 min',
      status: statusByRange(readMetric(values, ['sleep_latency', 'latence_endormissement']), 10, 30),
    },
    {
      label: 'Réveils nocturnes',
      value: readMetric(values, ['awakenings', 'reveils_nocturnes']),
      norm: '< 10',
      status: statusByRange(readMetric(values, ['awakenings', 'reveils_nocturnes']), 0, 10),
    },
  ]

  const respiratoryRows: ReportMetric[] = [
    {
      label: 'IAH (événements/h)',
      value: iahRaw,
      norm: '< 5',
      status: severity.status,
    },
    {
      label: 'Indice désaturation',
      value: readMetric(values, ['odi', 'indice_desaturation']),
      norm: '< 5',
      status: statusByRange(readMetric(values, ['odi', 'indice_desaturation']), 0, 5),
    },
    {
      label: 'Ronflement (%)',
      value: readMetric(values, ['snoring_percentage', 'ronflement']),
      norm: '< 20 %',
      status: statusByRange(readMetric(values, ['snoring_percentage', 'ronflement']), 0, 20),
    },
  ]

  const oxymetryRows: ReportMetric[] = [
    {
      label: 'SpO₂ moyenne',
      value: readMetric(values, ['spo2_mean', 'sao2_moyenne']),
      norm: '≥ 94 %',
      status: statusByRange(readMetric(values, ['spo2_mean', 'sao2_moyenne']), 94, 100),
    },
    {
      label: 'SpO₂ minimale',
      value: readMetric(values, ['spo2_min', 'sao2_min']),
      norm: '≥ 90 %',
      status: statusByRange(readMetric(values, ['spo2_min', 'sao2_min']), 90, 100),
    },
    {
      label: 'Temps < 90 %',
      value: readMetric(values, ['t90', 'temps_sous_90']),
      norm: '< 10 %',
      status: statusByRange(readMetric(values, ['t90', 'temps_sous_90']), 0, 10),
    },
  ]

  const conclusion = readMetric(values, ['conclusion', 'richtext', 'texte_conclusion'], 'Conclusion non renseignée.')
  const studyType = study.study_type || 'Non précisé'
  const patientRef = study.patient_reference || 'N/A'
  const dateLabel = generatedAt || new Date().toLocaleDateString('fr-FR')
  const signalChip =
    parseNumber(readMetric(values, ['spo2_min', 'sao2_min'])) !== null &&
    (parseNumber(readMetric(values, ['spo2_min', 'sao2_min'])) ?? 100) < 90
      ? 'Désaturation'
      : 'Stables'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.logo}>SOMNOVENTIS</Text>
              <Text style={styles.brandSub}>SLEEP MEDICINE REPORTING</Text>
            </View>
            <View>
              <Text style={styles.reportType}>Rapport {studyType}</Text>
              <Text style={styles.reportRef}>Réf: {patientRef}</Text>
            </View>
          </View>
        </View>

        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Type examen</Text>
            <Text style={styles.chipValue}>{studyType}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Sévérité</Text>
            <Text style={styles.chipValue}>{severity.label}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Signaux</Text>
            <Text style={styles.chipValue}>{signalChip}</Text>
          </View>
        </View>

        <View style={styles.grid2}>
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Patient</Text>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Référence</Text>
              <Text style={styles.rowValue}>{patientRef}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Date rapport</Text>
              <Text style={styles.rowValue}>{dateLabel}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Technicien</Text>
              <Text style={styles.rowValue}>{agentName || 'Agent'}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Prescription</Text>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Médecin</Text>
              <Text style={styles.rowValue}>{study.prescription_doctor || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Date</Text>
              <Text style={styles.rowValue}>{study.prescription_date || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Type</Text>
              <Text style={styles.rowValue}>{studyType}</Text>
            </View>
          </View>
        </View>

        <View style={styles.severityBlock}>
          <View>
            <Text style={styles.severityLabel}>Niveau de sévérité</Text>
            <Text style={styles.severityText}>{severity.label}</Text>
          </View>
          <Text style={styles.iahValue}>{iahRaw === '-' ? '—' : iahRaw}</Text>
        </View>

        <MetricTable title="Architecture" rows={architectureRows} />
        <MetricTable title="Respiratoire" rows={respiratoryRows} />
        <MetricTable title="Oxymétrie" rows={oxymetryRows} />

        <View style={styles.conclusion}>
          <Text style={styles.conclusionTitle}>Conclusion</Text>
          <Text style={styles.conclusionBody}>{conclusion}</Text>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signatureCol}>
            <Text style={styles.signatureLabel}>Signature technicien</Text>
            <Text style={styles.signatureLine}>{agentName || 'Agent'}</Text>
          </View>
          <View style={styles.signatureCol}>
            <Text style={styles.signatureLabel}>Signature médecin</Text>
            <Text style={styles.signatureLine}>Dr. ____________________</Text>
          </View>
        </View>

        <View fixed style={styles.footer}>
          <Text style={styles.footerText}>Ref {patientRef}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber}${totalPages ? `/${totalPages}` : ''}`}
          />
        </View>
      </Page>
    </Document>
  )
}

export default ReportPDF
