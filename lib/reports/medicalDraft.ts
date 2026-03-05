type StudyType = 'PSG' | 'PV' | 'MSLT' | 'MWT'

type Severity = 'normal' | 'léger' | 'modéré' | 'sévère'

interface StudyInfo {
  patientReference: string
  studyType: StudyType
  agentName: string
}

interface SectionValues {
  [field: string]: string
}

interface ReportValues {
  [sectionId: string]: SectionValues
}

export interface MedicalDraftResult {
  sections: Record<string, string>
  conclusion: string
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function severityFromThresholds(value: number | null, limits: { normalMax: number; mildMax: number; moderateMax: number }): Severity {
  if (value === null) return 'normal'
  if (value < limits.normalMax) return 'normal'
  if (value < limits.mildMax) return 'léger'
  if (value < limits.moderateMax) return 'modéré'
  return 'sévère'
}

function severityLabel(severity: Severity): string {
  if (severity === 'normal') return 'dans les limites de la normale'
  if (severity === 'léger') return 'de degré léger'
  if (severity === 'modéré') return 'de degré modéré'
  return 'de degré sévère'
}

function buildRespiratory(values: ReportValues): { text: string; summary: string[] } {
  const respiratory = values.respiratory ?? {}
  const iah = toNumber(respiratory.iah)
  const iahSupin = toNumber(respiratory.iah_supin)
  const iahNonSupin = toNumber(respiratory.iah_non_supin)
  const iahRem = toNumber(respiratory.iah_rem)
  const iahNrem = toNumber(respiratory.iah_nrem)
  const ido = toNumber(respiratory.ido)
  const longestApnea = toNumber(respiratory.longest_apnea_sec)
  const cheyneStokes = toNumber(respiratory.cheyne_stokes_index)
  const snoring = respiratory.snoring?.trim()

  const iahSeverity = severityFromThresholds(iah, { normalMax: 5, mildMax: 15, moderateMax: 30 })
  const idoSeverity = severityFromThresholds(ido, { normalMax: 5, mildMax: 15, moderateMax: 30 })

  const lines: string[] = []
  const summary: string[] = []

  if (iah !== null) {
    lines.push(`L'index d'apnées-hypopnées (IAH) est mesuré à ${iah.toFixed(1)}/h, compatible avec un syndrome respiratoire du sommeil ${severityLabel(iahSeverity)}.`)
    if (iahSeverity === 'sévère') {
      summary.push(`SAOS de degré sévère (IAH ${iah.toFixed(1)}/h).`)
    } else if (iahSeverity !== 'normal') {
      summary.push(`SAOS ${iahSeverity} (IAH ${iah.toFixed(1)}/h).`)
    }
  } else {
    lines.push(`L'IAH n'est pas renseigné, ne permettant pas une gradation respiratoire complète.`)
  }

  if (iahSupin !== null && iahNonSupin !== null && iahNonSupin > 0) {
    const positionalRatio = iahSupin / iahNonSupin
    lines.push(`La comparaison positionnelle retrouve un IAH supin à ${iahSupin.toFixed(1)}/h versus ${iahNonSupin.toFixed(1)}/h en non-supin.`)
    if (positionalRatio > 2) {
      lines.push(`Le profil est fortement positionnel, avec majoration nette des événements en décubitus dorsal.`)
      summary.push('Composante positionnelle marquée des événements respiratoires.')
    }
  }

  if (ido !== null) {
    lines.push(`L'index de désaturation (IDO) est à ${ido.toFixed(1)}/h, de sévérité ${idoSeverity}.`)
  }

  if (iahRem !== null && iahNrem !== null && iahNrem > 0) {
    if (iahRem > 2 * iahNrem) {
      lines.push('Trouble respiratoire avec une forte composante liée au sommeil paradoxal.')
      summary.push('Composante REM marquée des événements respiratoires.')
    }
  }

  if (longestApnea !== null) {
    lines.push(`La durée de l'apnée la plus longue est de ${longestApnea.toFixed(0)} secondes.`)
    if (longestApnea > 60) {
      lines.push('ALERTE : Présence d\'apnées très prolongées (>60s) avec impact cardiovasculaire probable.')
      summary.push('Apnées très prolongées (>60s).')
    }
  }

  if (cheyneStokes !== null) {
    lines.push(`L'index de Cheyne-Stokes est estimé à ${cheyneStokes.toFixed(1)}%.`)
  }

  if (snoring) {
    lines.push(`Le ronflement est qualifié de : ${snoring.toLowerCase()}.`)
    if (snoring.toLowerCase() === 'positionnel') {
      lines.push('Ronchopathie strictement positionnelle (décubitus dorsal).')
      summary.push('Ronchopathie positionnelle dorsale.')
    }
  }

  return { text: lines.join(' '), summary }
}

function buildOxymetry(values: ReportValues): { text: string; summary: string[] } {
  const respiratory = values.respiratory ?? {}
  const oxymetry = values.oxymetry ?? {}
  const spo2Mean = toNumber(respiratory.spo2_moyenne)
  const spo2Min = toNumber(respiratory.spo2_min)
  const ct90 = toNumber(respiratory.ct90)
  const spo2BaseAwake = toNumber(oxymetry.spo2_base_awake)
  const timeUnder88 = toNumber(oxymetry.time_under_88)
  const baselineStability = oxymetry.baseline_stability?.trim()

  const t90Severity = severityFromThresholds(ct90, { normalMax: 1, mildMax: 10, moderateMax: 30 })
  const lines: string[] = []
  const summary: string[] = []

  if (spo2Mean !== null || spo2Min !== null) {
    lines.push(`L'oxygénation moyenne est à ${spo2Mean !== null ? `${spo2Mean.toFixed(1)}%` : 'Non renseigné'} avec un nadir à ${spo2Min !== null ? `${spo2Min.toFixed(1)}%` : 'Non renseigné'}.`)
  }

  if (ct90 !== null) {
    lines.push(`Le temps passé sous 90% (T90/CT90) est de ${ct90.toFixed(1)}%, correspondant à une atteinte ${t90Severity}.`)
    if (t90Severity !== 'normal') {
      summary.push(`Hypoxémie nocturne ${t90Severity} (T90 ${ct90.toFixed(1)}%).`)
    }
  }

  if (spo2BaseAwake !== null) {
    lines.push(`La SpO2 de base au repos (éveil) est de ${spo2BaseAwake.toFixed(1)}%.`)
  }

  if (timeUnder88 !== null) {
    lines.push(`Le temps passé sous 88% est de ${timeUnder88.toFixed(1)}%.`)
  }

  if (baselineStability) {
    lines.push(`La stabilité de la ligne de base oxymétrique est jugée ${baselineStability.toLowerCase()}.`)
  }

  if (lines.length === 0) {
    lines.push(`Les paramètres d'oxymétrie sont insuffisamment renseignés pour une analyse complète.`)
  }

  return { text: lines.join(' '), summary }
}

function buildArchitecture(values: ReportValues): { text: string; summary: string[] } {
  const architecture = values.sleep_architecture ?? values.mslt_results ?? values.mwt_results ?? {}
  const efficiency = toNumber(architecture.efficacite)
  const latency = toNumber(architecture.latence_endormissement)
  const arousalIndex = toNumber(architecture.index_eveil)

  const arousalSeverity = severityFromThresholds(arousalIndex, { normalMax: 10, mildMax: 25, moderateMax: 50 })
  const lines: string[] = []
  const summary: string[] = []

  if (efficiency !== null) {
    lines.push(`L'efficacité de sommeil est estimée à ${efficiency.toFixed(1)}%.`)
  }
  if (latency !== null) {
    lines.push(`La latence d'endormissement est de ${latency.toFixed(1)} minutes.`)
  }
  if (arousalIndex !== null) {
    lines.push(`L'index d'éveil est à ${arousalIndex.toFixed(1)}/h, traduisant une fragmentation ${arousalSeverity}.`)
    if (arousalSeverity !== 'normal') {
      summary.push(`Fragmentation du sommeil ${arousalSeverity} (index d'éveil ${arousalIndex.toFixed(1)}/h).`)
    }
  }

  if (efficiency !== null && arousalIndex !== null && efficiency < 70 && arousalIndex >= 25) {
    lines.push('Sommeil très fragmenté et instable, potentiellement peu représentatif de l\'état habituel du patient.')
    summary.push('Sommeil peu consolidé avec probable impact sur la représentativité de l’examen.')
  }

  if (lines.length === 0) {
    lines.push(`L'architecture du sommeil ne montre pas de données quantitatives exploitables dans le brouillon actuel.`)
  }

  return { text: lines.join(' '), summary }
}

function buildMovements(values: ReportValues): { text: string; summary: string[] } {
  const movement = values.movements ?? values.mwt_results ?? values.mslt_results ?? {}
  const impj = toNumber(movement.impj)

  const lines: string[] = []
  const summary: string[] = []

  if (impj !== null) {
    const severity = severityFromThresholds(impj, { normalMax: 15, mildMax: 25, moderateMax: 50 })
    lines.push(`L'index de mouvements périodiques des jambes (IMPJ) est de ${impj.toFixed(1)}/h, classé ${severity}.`)
    if (severity !== 'normal') {
      summary.push(`Mouvements périodiques des jambes ${severity} (IMPJ ${impj.toFixed(1)}/h).`)
    }
  } else {
    lines.push(`Aucune élévation objectivée des mouvements périodiques n'est documentée dans les données saisies.`)
  }

  return { text: lines.join(' '), summary }
}

function buildSpecialStudyLogic(studyType: StudyType, values: ReportValues): string[] {
  const special: string[] = []
  const results = studyType === 'MSLT' ? values.mslt_results : studyType === 'MWT' ? values.mwt_results : undefined
  const lme = toNumber(results?.latence_moyenne)
  const soremp = toNumber(results?.nombre_soremp)

  if (studyType === 'MSLT' && lme !== null) {
    if (lme <= 8 && (soremp ?? 0) >= 2) {
      special.push('Le profil TILE (LME ≤ 8 min et ≥ 2 SOREM) est compatible avec une hypersomnolence centrale de type narcolepsie, à corréler au contexte clinique.')
    } else {
      special.push('Le profil TILE ne remplit pas les critères complets de narcolepsie sur les éléments fournis.')
    }
  }

  if (studyType === 'MWT' && lme !== null) {
    if (lme < 8) {
      special.push('La latence moyenne au TME est inférieure à 8 minutes, indiquant un risque accidentel majoré et une vigilance diurne insuffisante.')
    } else {
      special.push('Le TME ne met pas en évidence de baisse critique de vigilance sur les valeurs renseignées.')
    }
  }

  return special
}

function buildRecommendations(summary: string[]): string[] {
  const recommendations: string[] = []

  const hasSevereSaos = summary.some((line) => line.includes('SAOS de degré sévère'))
  if (hasSevereSaos) {
    recommendations.push('Mise en place d’un traitement par PPC avec contrôle de l’observance et titration adaptée.')
  }

  recommendations.push('Optimisation des mesures hygiéno-diététiques et de la gestion des facteurs de risque cardiovasculaire.')
  recommendations.push('Corrélation clinico-polysomnographique et validation médicale finale avant diffusion du compte-rendu.')

  return recommendations
}

export function generateMedicalDraft(study: StudyInfo, values: ReportValues): MedicalDraftResult {
  const architecture = buildArchitecture(values)
  const respiratory = buildRespiratory(values)
  const oxymetry = buildOxymetry(values)
  const movements = buildMovements(values)
  const special = buildSpecialStudyLogic(study.studyType, values)

  const synthesis = [...respiratory.summary, ...oxymetry.summary, ...architecture.summary, ...movements.summary]
  const recommendations = buildRecommendations(synthesis)

  const conclusionLines: string[] = []
  if (synthesis.length > 0) {
    conclusionLines.push('Synthèse diagnostique :')
    synthesis.forEach((line, index) => {
      conclusionLines.push(`${index + 1}. ${line}`)
    })
  } else {
    conclusionLines.push('Synthèse diagnostique : Données insuffisantes pour une conclusion catégorique.')
  }

  if (special.length > 0) {
    conclusionLines.push('', ...special)
  }

  conclusionLines.push('', 'Recommandations :')
  recommendations.forEach((line, index) => {
    conclusionLines.push(`${index + 1}. ${line}`)
  })

  return {
    sections: {
      technical:
        `Informations d'étude : dossier ${study.patientReference}, type ${study.studyType}, opérateur ${study.agentName}. Ce texte est un brouillon automatisé à valider médicalement.`,
      sleep_architecture: architecture.text,
      respiratory: respiratory.text,
      movements: movements.text,
      oxymetry: oxymetry.text,
    },
    conclusion: conclusionLines.join('\n'),
  }
}
