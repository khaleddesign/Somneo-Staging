import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

type SectionType = 'info' | 'text' | 'metrics' | 'richtext'

interface TemplateField {
  key: string
  label: string
  unit: string
}

interface TemplateSection {
  id: string
  title: string
  type: SectionType
  fields?: TemplateField[]
}

interface ReportPDFProps {
  studyType: 'PSG' | 'PV' | 'MSLT' | 'MWT'
  patientReference: string
  agentName: string
  generatedAt: string
  sections: TemplateSection[]
  values: Record<string, Record<string, string>>
}

const colors = {
  midnight: '#06111f',
  teal: '#1ec8d4',
  gold: '#c8a45a',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  border: '#e5e7eb',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: colors.midnight,
    position: 'relative',
  },
  topBand: {
    height: 8,
    backgroundColor: colors.teal,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  brandMain: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.midnight,
  },
  brandSub: {
    fontSize: 9,
    color: colors.gray,
  },
  headerDate: {
    fontSize: 9,
    color: colors.gray,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.midnight,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: colors.teal,
    marginBottom: 10,
  },
  separator: {
    height: 1,
    backgroundColor: colors.gold,
    marginBottom: 14,
  },
  section: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sectionTitle: {
    backgroundColor: colors.lightGray,
    color: colors.midnight,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 10,
  },
  sectionBody: {
    padding: 8,
    gap: 6,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoCell: {
    width: '50%',
    paddingRight: 8,
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 8,
    color: colors.gray,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: colors.midnight,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  italicParagraph: {
    fontSize: 10,
    lineHeight: 1.4,
    fontStyle: 'italic',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.midnight,
  },
  colParam: {
    width: '50%',
  },
  colValue: {
    width: '25%',
  },
  colUnit: {
    width: '25%',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 16,
  },
  footerLine1: {
    fontSize: 8,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 2,
  },
  footerLine2: {
    fontSize: 8,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 6,
  },
  bottomBand: {
    height: 4,
    backgroundColor: colors.teal,
  },
  logoHidden: {
    width: 0,
    height: 0,
  },
})

function getValue(values: Record<string, Record<string, string>>, sectionId: string, key: string): string {
  return values[sectionId]?.[key] ?? '-'
}

export default function ReportPDF({
  studyType,
  patientReference,
  agentName,
  generatedAt,
  sections,
  values,
}: ReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBand} />

        <View style={styles.headerRow}>
          <View style={styles.headerBrand}>
            <Text style={styles.brandMain}>SomnoConnect</Text>
            <Text style={styles.brandSub}>by SOMNOVENTIS</Text>
            <Image style={styles.logoHidden} src="" />
          </View>
          <Text style={styles.headerDate}>{generatedAt}</Text>
        </View>

        <Text style={styles.title}>Compte-rendu d&apos;étude du sommeil</Text>
        <Text style={styles.subtitle}>Type: {studyType} | Patient: {patientReference}</Text>
        <View style={styles.separator} />

        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionBody}>
              {section.type === 'info' && (
                <View style={styles.infoGrid}>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>Référence patient</Text>
                    <Text style={styles.infoValue}>{patientReference}</Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>Type d&apos;étude</Text>
                    <Text style={styles.infoValue}>{studyType}</Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>Date</Text>
                    <Text style={styles.infoValue}>{generatedAt}</Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>Agent</Text>
                    <Text style={styles.infoValue}>{agentName}</Text>
                  </View>
                </View>
              )}

              {section.type === 'text' && (
                <Text style={styles.paragraph}>{getValue(values, section.id, 'text')}</Text>
              )}

              {section.type === 'metrics' && (
                <>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.colParam]}>Paramètre</Text>
                    <Text style={[styles.tableHeaderCell, styles.colValue]}>Valeur</Text>
                    <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unité</Text>
                  </View>

                  {(section.fields ?? []).map((field) => (
                    <View key={field.key} style={styles.tableRow}>
                      <Text style={styles.colParam}>{field.label}</Text>
                      <Text style={styles.colValue}>{getValue(values, section.id, field.key)}</Text>
                      <Text style={styles.colUnit}>{field.unit || '-'}</Text>
                    </View>
                  ))}
                </>
              )}

              {section.type === 'richtext' && (
                <Text style={styles.italicParagraph}>{getValue(values, section.id, 'richtext')}</Text>
              )}
            </View>
          </View>
        ))}

        <View fixed style={styles.footer}>
          <Text style={styles.footerLine1}>SOMNOVENTIS F.Z.E | contact@somnoventis.com</Text>
          <Text
            style={styles.footerLine2}
            render={({ pageNumber, totalPages }) => `Document confidentiel - Page ${pageNumber}${totalPages ? `/${totalPages}` : ''}`}
            fixed
          />
          <View style={styles.bottomBand} />
        </View>
      </Page>
    </Document>
  )
}
