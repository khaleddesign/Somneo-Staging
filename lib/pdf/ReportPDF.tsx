import React from 'react'
import fs from 'fs'
import path from 'path'
import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

type ReportRowStatus = 'ok' | 'warn' | 'bad' | 'mod'

interface ReportRecord {
  id?: string
  created_at?: string
  content?: unknown
  template_data?: unknown
}

interface StudyRecord {
  id?: string
  patient_id?: string
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
  slate: '#64748b',
  light: '#f0f4f8',
  border: '#dbe4ec',
  text: '#1f2a37',
  white: '#ffffff',
  okBg: '#ecfdf5',
  okText: '#065f46',
  warnBg: '#fffbeb',
  warnText: '#92400e',
  badBg: '#fff1f2',
  badText: '#9f1239',
  modBg: '#fff7ed',
  modText: '#9a3412',
}

const syneRegularPath = path.join(process.cwd(), 'public/fonts/Syne-Regular.ttf')
const syneSemiBoldPath = path.join(process.cwd(), 'public/fonts/Syne-SemiBold.ttf')
const syneBoldPath = path.join(process.cwd(), 'public/fonts/Syne-Bold.ttf')
const dmSansRegularPath = path.join(process.cwd(), 'public/fonts/DMSans-Regular.ttf')
const dmSansMediumPath = path.join(process.cwd(), 'public/fonts/DMSans-Medium.ttf')

const requiredFontPaths = [
  syneRegularPath,
  syneSemiBoldPath,
  syneBoldPath,
  dmSansRegularPath,
  dmSansMediumPath,
]

for (const fontPath of requiredFontPaths) {
  if (!fs.existsSync(fontPath)) {
    throw new Error(`[ReportPDF] Missing font file: ${fontPath}`)
  }
}

Font.register({
  family: 'Syne',
  fonts: [
    { src: syneRegularPath, fontWeight: 400 },
    { src: syneSemiBoldPath, fontWeight: 600 },
    { src: syneBoldPath, fontWeight: 700 },
  ],
})

Font.register({
  family: 'DMSans',
  fonts: [
    { src: dmSansRegularPath, fontWeight: 400 },
    { src: dmSansMediumPath, fontWeight: 500 },
  ],
})

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 34,
    paddingHorizontal: 24,
    fontFamily: 'DMSans',
    fontSize: 9,
    color: colors.text,
  },
  header: {
    backgroundColor: colors.midnight,
    borderTopWidth: 4,
    borderTopColor: colors.teal,
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    color: colors.teal,
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
    marginBottom: 8,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
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
    gap: 6,
    marginBottom: 8,
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    backgroundColor: colors.light,
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
    marginBottom: 3,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
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
    fontSize: 36,
    fontWeight: 700,
    color: '#f87171',
    lineHeight: 1,
  },
  tableSection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 8,
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
    paddingVertical: 5,
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
    paddingVertical: 6,
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
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 8,
    fontFamily: 'Syne',
    fontWeight: 600,
  },
  conclusion: {
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: 2,
    marginBottom: 8,
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
    marginTop: 4,
  },
  signatureCol: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 8,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 14,
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
    left: 24,
    right: 24,
    bottom: 10,
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

function getSection(values: Record<string, Record<string, string>>, section: string): Record<string, string> {
  return values[section] || {}
}

function getMetric(
  values: Record<string, Record<string, string>>,
  section: string,
  key: string,
  fallback = '-',
): string {
  const sectionValues = getSection(values, section)
  const value = sectionValues[key]
  return typeof value === 'string' && value.trim() ? value : fallback
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
          <View
            key={`${title}-${index}`}
            style={[
              styles.tableRow,
              index % 2 === 1 ? { backgroundColor: '#f8fafc' } : {},
            ]}
          >
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

  const iahRaw = getMetric(values, 'respiratoire', 'iah')
  const iah = parseNumber(iahRaw)
  const severity = severityFromIah(iah)

  const sommeilEfficacite = getMetric(values, 'sommeil', 'efficacite')
  const sommeilTst = getMetric(values, 'sommeil', 'temps_sommeil')
  const sommeilTib = getMetric(values, 'sommeil', 'temps_lit')
  const spo2Moyenne = getMetric(values, 'oximetrie', 'spo2_moyenne')
  const spo2Min = getMetric(values, 'oximetrie', 'spo2_min')
  const ct90 = getMetric(values, 'oximetrie', 'ct90')

  const architectureRows: ReportMetric[] = [
    {
      label: 'Efficacité',
      value: sommeilEfficacite,
      norm: '> 85 %',
      status: statusByRange(sommeilEfficacite, 85, 100),
    },
    {
      label: 'TST',
      value: sommeilTst,
      norm: 'min',
      status: statusByRange(sommeilTst, 1, 2000),
    },
    {
      label: 'TIB',
      value: sommeilTib,
      norm: 'min',
      status: statusByRange(sommeilTib, 1, 2000),
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
      label: 'SpO₂ moyenne',
      value: spo2Moyenne,
      norm: '≥ 94 %',
      status: statusByRange(spo2Moyenne, 94, 100),
    },
    {
      label: 'SpO₂ minimale',
      value: spo2Min,
      norm: '≥ 90 %',
      status: statusByRange(spo2Min, 90, 100),
    },
  ]

  const oxymetryRows: ReportMetric[] = [
    {
      label: 'SpO₂ moyenne',
      value: spo2Moyenne,
      norm: '≥ 94 %',
      status: statusByRange(spo2Moyenne, 94, 100),
    },
    {
      label: 'SpO₂ minimale',
      value: spo2Min,
      norm: '≥ 90 %',
      status: statusByRange(spo2Min, 90, 100),
    },
    {
      label: 'CT90',
      value: ct90,
      norm: '< 5',
      status: statusByRange(ct90, 0, 5),
    },
  ]

  const conclusion = getMetric(values, 'conclusion', 'richtext', 'Conclusion non renseignée.')
  const studyType = study.study_type || 'Non précisé'
  const patientRef = study.patient_id || study.patient_reference || 'N/A'
  const dateLabel = report.created_at
    ? new Date(report.created_at).toLocaleDateString('fr-FR')
    : (generatedAt || new Date().toLocaleDateString('fr-FR'))
  const signalChip =
    parseNumber(spo2Min) !== null &&
    (parseNumber(spo2Min) ?? 100) < 90
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
