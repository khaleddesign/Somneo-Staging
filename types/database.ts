export type Role = 'admin' | 'agent' | 'client'
export type StudyStatus = 'en_attente' | 'en_cours' | 'termine' | 'annule'
export type StudyType = 'PSG' | 'PV' | 'MSLT' | 'MWT'
export type Priority = 'low' | 'medium' | 'high'

export interface Institution {
  id: string
  name: string
  address: string | null
  contact_info: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  institution_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  email: string
  full_name: string | null
  token: string
  role_invited: string
  created_by: string
  institution_id: string
  expires_at: string | null
  used_at: string | null
  created_at: string
}

export interface Study {
  id: string
  client_id: string
  patient_reference: string
  study_type: StudyType
  status: StudyStatus
  priority: Priority
  assigned_agent_id: string | null
  file_path: string | null
  file_size_orig: number | null
  checksum: string | null
  report_path: string | null
  notes: string | null
  submitted_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface StudyHistory {
  id: string
  study_id: string
  old_status: string | null
  new_status: string
  changed_by: string
  changed_at: string
}

export interface Comment {
  id: string
  study_id: string
  user_id: string
  message: string
  attachment_path: string | null
  created_at: string
}
