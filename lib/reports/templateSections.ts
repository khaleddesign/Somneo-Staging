type StudyType = "PSG" | "PV" | "MSLT" | "MWT";
type SectionType = "info" | "text" | "metrics" | "richtext";

interface TemplateField {
  key: string;
  label: string;
  unit: string;
}

interface TemplateSection {
  id: string;
  title: string;
  type: SectionType;
  placeholder?: string;
  fields?: TemplateField[];
}

function addMissingFields(
  section: TemplateSection,
  fields: TemplateField[],
): TemplateSection {
  if (section.type !== "metrics") return section;

  const existing = new Set((section.fields ?? []).map((field) => field.key));
  const merged = [...(section.fields ?? [])];
  fields.forEach((field) => {
    if (!existing.has(field.key)) {
      merged.push(field);
    }
  });

  return {
    ...section,
    fields: merged,
  };
}

function hasSection(sections: TemplateSection[], id: string): boolean {
  return sections.some((section) => section.id === id);
}

export function enhanceTemplateSections(
  studyType: StudyType,
  rawSections: unknown,
): TemplateSection[] {
  if (!Array.isArray(rawSections)) return [];

  const sections: TemplateSection[] = rawSections
    .filter(
      (item): item is TemplateSection =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "type" in item &&
        "title" in item,
    )
    .map((section) => ({
      ...section,
      fields: section.fields ? [...section.fields] : undefined,
    }));

  if (!["PSG", "PV"].includes(studyType)) {
    return sections;
  }

  const respiratoryExtra: TemplateField[] = [
    { key: "iah_rem", label: "IAH REM", unit: "/h" },
    { key: "iah_nrem", label: "IAH NREM", unit: "/h" },
    {
      key: "longest_apnea_sec",
      label: "Durée apnée la plus longue",
      unit: "sec",
    },
    { key: "cheyne_stokes_index", label: "Index de Cheyne-Stokes", unit: "%" },
    { key: "snoring", label: "Ronflement", unit: "" },
  ];

  const respiratoryIndex = sections.findIndex(
    (section) => section.id === "respiratory" && section.type === "metrics",
  );
  if (respiratoryIndex >= 0) {
    sections[respiratoryIndex] = addMissingFields(
      sections[respiratoryIndex],
      respiratoryExtra,
    );
  }

  if (!hasSection(sections, "oxymetry")) {
    sections.splice(Math.max(sections.length - 1, 1), 0, {
      id: "oxymetry",
      title: "Analyse Oxymétrique Détaillée",
      type: "metrics",
      fields: [
        {
          key: "spo2_base_awake",
          label: "SpO2 de base au repos (éveil)",
          unit: "%",
        },
        { key: "time_under_88", label: "Temps passé sous 88%", unit: "%" },
        {
          key: "baseline_stability",
          label: "Stabilité ligne de base",
          unit: "",
        },
      ],
    });
  }

  return sections;
}
