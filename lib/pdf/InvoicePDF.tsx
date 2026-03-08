import React from 'react'
import path from 'path'
import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

interface InvoiceStudyItem {
  id: string
  study_type: 'PSG' | 'PV' | 'MSLT' | 'MWT' | string
  patient_reference?: string | null
  created_at?: string | null
}

interface InvoiceClient {
  full_name?: string | null
  email?: string | null
}

interface InvoiceData {
  invoice_number: string
  mode: 'per_study' | 'monthly' | string
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | string
  billing_month?: string | null
  due_date?: string | null
  created_at?: string | null
  subtotal_ht: number
  tva_rate: number
  total_ttc: number
}

interface InvoicePDFProps {
  invoice: InvoiceData
  client: InvoiceClient
  studies: InvoiceStudyItem[]
  pricesByType: Record<string, number>
}

const colors = {
  midnight: '#06111f',
  teal: '#1ec8d4',
  gold: '#c8a45a',
  slate: '#64748b',
  light: '#f0f4f8',
  border: '#dbe4ec',
  text: '#1f2a37',
  white: '#ffffff',
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
    { src: path.join(process.cwd(), 'public/fonts/DMSans-Regular.ttf'), fontWeight: 400, fontStyle: 'italic' },
  ],
})

Font.register({
  family: 'Cormorant Garamond',
  fonts: [
    {
      src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/CormorantGaramond-Bold.ttf',
      fontWeight: 700,
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 46,
    paddingHorizontal: 24,
    fontFamily: 'DMSans',
    fontSize: 10,
    color: colors.text,
  },
  header: {
    backgroundColor: colors.midnight,
    borderTopWidth: 4,
    borderTopColor: colors.teal,
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    fontFamily: 'Cormorant Garamond',
    fontWeight: 700,
    fontSize: 24,
    color: colors.teal,
    lineHeight: 1,
  },
  rightHeader: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontFamily: 'Cormorant Garamond',
    fontWeight: 700,
    fontSize: 26,
    color: colors.white,
    lineHeight: 1,
  },
  invoiceNumber: {
    color: '#b8c7d8',
    fontSize: 9,
    marginTop: 2,
    fontFamily: 'Syne',
    fontWeight: 600,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
  },
  chipLabel: {
    color: colors.slate,
    fontSize: 8,
  },
  chipValue: {
    color: colors.midnight,
    fontFamily: 'Syne',
    fontWeight: 600,
    fontSize: 9,
    marginTop: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
  },
  cardTitle: {
    fontSize: 8,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  cardLine: {
    fontSize: 10,
    marginBottom: 2,
  },
  dateChips: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  dateChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
  },
  dateLabel: {
    fontSize: 8,
    color: colors.slate,
  },
  dateValue: {
    marginTop: 2,
    fontFamily: 'Syne',
    fontWeight: 600,
    fontSize: 9,
    color: colors.midnight,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
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
    letterSpacing: 0.3,
  },
  colDesignation: { width: '46%' },
  colType: { width: '14%' },
  colDate: { width: '20%' },
  colPrice: { width: '20%', textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f6',
    alignItems: 'center',
  },
  td: {
    fontSize: 9,
  },
  tdPrice: {
    fontSize: 10,
    fontFamily: 'Syne',
    fontWeight: 600,
    textAlign: 'right',
  },
  totalsWrap: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  totalLine: {
    width: 220,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    color: colors.slate,
    fontSize: 10,
  },
  totalValue: {
    fontFamily: 'Syne',
    fontWeight: 600,
    fontSize: 10,
    color: colors.midnight,
  },
  totalTtcLabel: {
    fontFamily: 'Syne',
    fontWeight: 700,
    fontSize: 12,
    color: colors.midnight,
  },
  totalTtcValue: {
    fontFamily: 'Syne',
    fontWeight: 700,
    fontSize: 24,
    color: colors.gold,
    lineHeight: 1,
  },
  paymentBox: {
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  paymentTitle: {
    fontFamily: 'Syne',
    fontWeight: 700,
    fontSize: 10,
    color: colors.midnight,
    marginBottom: 6,
  },
  paymentLine: {
    fontSize: 9,
    marginBottom: 2,
  },
  legal: {
    color: '#7c8593',
    fontSize: 10,
    fontStyle: 'italic',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.midnight,
    paddingVertical: 8,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: '#d3deea',
    fontFamily: 'Syne',
    fontWeight: 600,
    fontSize: 9,
  },
})

function formatDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('fr-FR')
}

function formatMoney(value: number): string {
  return `${value.toFixed(2)} €`
}

function modeLabel(mode: string): string {
  if (mode === 'monthly') return 'Mensuelle'
  if (mode === 'per_study') return 'Par étude'
  return mode
}

function statusLabel(status: string): string {
  if (status === 'draft') return 'Brouillon'
  if (status === 'sent') return 'Envoyée'
  if (status === 'paid') return 'Payée'
  if (status === 'cancelled') return 'Annulée'
  return status
}

export function InvoicePDF({ invoice, client, studies, pricesByType }: InvoicePDFProps) {
  const billedAt = formatDate(invoice.created_at)
  const dueDate = formatDate(invoice.due_date)
  const period = invoice.billing_month || 'Sur sélection'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.logo}>SOMNOVENTIS</Text>
            <View style={styles.rightHeader}>
              <Text style={styles.invoiceTitle}>Facture</Text>
              <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            </View>
          </View>
        </View>

        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Mode facturation</Text>
            <Text style={styles.chipValue}>{modeLabel(invoice.mode)}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Statut</Text>
            <Text style={styles.chipValue}>{statusLabel(invoice.status)}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Total TTC</Text>
            <Text style={styles.chipValue}>{formatMoney(invoice.total_ttc)}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Facturé à</Text>
            <Text style={styles.cardLine}>{client.full_name || '-'}</Text>
            <Text style={styles.cardLine}>{client.email || '-'}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>SOMNOVENTIS F.Z.E</Text>
            <Text style={styles.cardLine}>Dubai Silicon Oasis, UAE</Text>
            <Text style={styles.cardLine}>contact@somnoventis.com</Text>
            <Text style={styles.cardLine}>TRN : 100123456700003</Text>
          </View>
        </View>

        <View style={styles.dateChips}>
          <View style={styles.dateChip}>
            <Text style={styles.dateLabel}>Date de facturation</Text>
            <Text style={styles.dateValue}>{billedAt}</Text>
          </View>
          <View style={styles.dateChip}>
            <Text style={styles.dateLabel}>Échéance</Text>
            <Text style={styles.dateValue}>{dueDate}</Text>
          </View>
          <View style={styles.dateChip}>
            <Text style={styles.dateLabel}>Réf. période</Text>
            <Text style={styles.dateValue}>{period}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colDesignation]}>Désignation</Text>
            <Text style={[styles.th, styles.colType]}>Type</Text>
            <Text style={[styles.th, styles.colDate]}>Date</Text>
            <Text style={[styles.th, styles.colPrice]}>Prix HT</Text>
          </View>

          {studies.map((study, index) => {
            const patient = study.patient_reference || '-'
            const price = pricesByType[study.study_type] ?? 0
            return (
              <View
                key={study.id}
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? { backgroundColor: '#f8fafc' } : {},
                ]}
              >
                <Text style={[styles.td, styles.colDesignation]}>{`Analyse ${study.study_type} — ${patient}`}</Text>
                <Text style={[styles.td, styles.colType]}>{study.study_type}</Text>
                <Text style={[styles.td, styles.colDate]}>{formatDate(study.created_at)}</Text>
                <Text style={[styles.tdPrice, styles.colPrice]}>{formatMoney(price)}</Text>
              </View>
            )
          })}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Sous-total HT</Text>
            <Text style={styles.totalValue}>{formatMoney(invoice.subtotal_ht)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>TVA 0% (Export UAE)</Text>
            <Text style={styles.totalValue}>{formatMoney(0)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalTtcLabel}>TOTAL TTC</Text>
            <Text style={styles.totalTtcValue}>{formatMoney(invoice.total_ttc)}</Text>
          </View>
        </View>

        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>Paiement</Text>
          <Text style={styles.paymentLine}>Banque : Emirates NBD</Text>
          <Text style={styles.paymentLine}>IBAN : AE07 0331 2345 6789 0123 456</Text>
          <Text style={styles.paymentLine}>SWIFT : EBILAEAD</Text>
          <Text style={styles.paymentLine}>{`Référence virement : ${invoice.invoice_number}`}</Text>
        </View>

        <Text style={styles.legal}>Pénalités retard : indemnité forfaitaire et intérêts de retard applicables après échéance.</Text>
        <Text style={styles.legal}>TVA non applicable hors UE : export de services depuis UAE.</Text>
        <Text style={styles.legal}>RGPD : les données patient sont traitées de manière strictement confidentielle.</Text>

        <View fixed style={styles.footer}>
          <Text style={styles.footerText}>{invoice.invoice_number}</Text>
          <Text style={styles.footerText}>Page 1/1</Text>
        </View>
      </Page>
    </Document>
  )
}

export default InvoicePDF
