export interface ParsedField {
  sectionId: string
  key: string
  value: string
}

const patterns: Array<{ sectionId: string; key: string; regex: RegExp }> = [
  { sectionId: 'respiratory', key: 'iah', regex: /(?:IAH|AHI)\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'respiratory', key: 'iah_supin', regex: /(?:IAH|AHI)\s*(?:supin|supine)\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'respiratory', key: 'iah_non_supin', regex: /(?:IAH|AHI)\s*(?:non[-\s]?supin|non[-\s]?supine)\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'respiratory', key: 'iah_rem', regex: /(?:IAH|AHI)\s*(?:REM)\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'respiratory', key: 'iah_nrem', regex: /(?:IAH|AHI)\s*(?:NREM)\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'respiratory', key: 'spo2_min', regex: /SpO2\s*(?:min(?:imale)?)\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'respiratory', key: 'spo2_moyenne', regex: /SpO2\s*(?:moy(?:enne)?)\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'respiratory', key: 'ct90', regex: /(?:T90|CT90)\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'respiratory', key: 'longest_apnea_sec', regex: /(?:apn(?:ée|ee)\s*(?:la\s*)?plus\s*longue|longest\s*apnea)\s*[:=]?\s*([\d.,]+)/i },
  { sectionId: 'sleep_architecture', key: 'efficacite', regex: /(?:Efficiency|Efficacit(?:é|e))\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'sleep_architecture', key: 'index_eveil', regex: /(?:Arousal\s*Index|Index\s*d[’' ]éveil)\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'oxymetry', key: 'spo2_base_awake', regex: /(?:SpO2\s*base|Baseline\s*SpO2)\s*[:=]\s*([\d.,]+)/i },
  { sectionId: 'oxymetry', key: 'time_under_88', regex: /(?:Time\s*<\s*88%|Temps\s*sous\s*88%)\s*[:=]\s*([\d.,]+)/i },
]

export function parseTextReport(text: string): ParsedField[] {
  const results: ParsedField[] = []

  patterns.forEach((pattern) => {
    const match = text.match(pattern.regex)
    if (!match?.[1]) return

    results.push({
      sectionId: pattern.sectionId,
      key: pattern.key,
      value: match[1].replace(',', '.').trim(),
    })
  })

  return results
}
