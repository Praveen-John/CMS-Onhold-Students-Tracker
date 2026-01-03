
export interface User {
  _id: string;
  googleId?: string;
  email: string;
  name: string;
  picture?: string;
  isAdmin: boolean;
  createdAt: string;
  lastLogin: string;
}

export interface Student {
  id: string;
  initiatedDate: string;
  studentName: string;
  phoneNumber?: string;
  registeredMailId: string;
  category: string;
  heldSchoolSection: string;
  changedToSchoolSection?: string;
  reminderDate: string;
  initiatedBy: string;
  team?: string;
  reasonToHold: string;
  followUpComments?: string;
  status?: Status;
  createdByEmail?: string;
  
  // Automation Fields
  stopReminders?: boolean;  // If true, auto-reminders are disabled
}

export interface Activity {
    id: string;
    user: string;
    action: 'LOGIN' | 'LOGOUT' | 'ADD_STUDENT' | 'EDIT_STUDENT' | 'DELETE_STUDENT' | 'ANALYZE_STUDENT' | 'UNAUTHORIZED_ACCESS' | 'SEND_EMAIL' | 'TOGGLE_REMINDER';
    details: string;
    timestamp: string;
}

// TODO: PLEASE UPDATE THE EMAIL ADDRESSES BELOW WITH THE ACTUAL AGENT EMAILS
export const initiators = [
    { name: "Jaya Shri P", team: "Operations", email: "jayashri_p@lmes.in" },
    { name: "Nagaraj S", team: "Operations", email: "nagaraj_s@lmes.in" },
    { name: "P S Shalini", team: "Operations", email: "shalini_s@lmes.in" },
    { name: "Abirama Sundari K", team: "Operations", email: "sundari_k@lmes.in" },
    { name: "Gokul Samraj", team: "Operations", email: "gokul_s@lmes.in" },
    { name: "Sivasankaran R", team: "Support - Voice Team", email: "sivasankaran_r@lmes.in" },
    { name: "Sakthivel Elumalai", team: "Support - Voice Team", email: "sakthivel_e@lmes.in" },
    { name: "Mani Bharathi C", team: "Support - Voice Team", email: "manibharathi_c@lmes.in" },
    { name: "Charulatha S", team: "Support - Voice Team", email: "charulatha_s@lmes.in" },
    { name: "Sivaprakash S", team: "Support - Voice Team", email: "sivaprakash_s@lmes.in" },
    { name: "Bharathi R", team: "Support - Voice Team", email: "bharathi_r@lmes.in" },
    { name: "Sansi Stafina", team: "Support - Voice Team", email: "sansi_v@lmes.in" },
    { name: "Dharshini", team: "Support - Voice Team", email: "dharshini_s@lmes.in" },
    { name: "Vinoth Kumar", team: "Support - Voice Team", email: "vinothkumar_s@lmes.in" },
    { name: "Srinath M", team: "Support - Voice Team", email: "srinath_m@lmes.in" },
    { name: "Arthi M", team: "Support - Voice Team", email: "aarthi_m@lmes.in" },
    { name: "Porselvan", team: "Support - Voice Team", email: "porselvan_j@lmes.in" },
    { name: "SivaPriya G", team: "Retention Team", email: "sivapriya_g@lmes.in" },
    { name: "Naveena R", team: "Retention Team", email: "naveena_r@lmes.in" },
    { name: "Abishek", team: "Support - Non Voice Team", email: "abishek_k@lmes.in" },
    { name: "Abdul", team: "Support - Non Voice Team", email: "abdul_a@lmes.in" },
    { name: "Ananthi", team: "Support - Non Voice Team", email: "ananthi_a@lmes.in" },
    { name: "karthick Varun", team: "Support - Non Voice Team", email: "karthickvarun_a@lmes.in" },
    { name: "Deepika", team: "Support - Non Voice Team", email: "deepika_a@lmes.in" },
    { name: "Ririth", team: "Support - Non Voice Team", email: "ririth_k@lmes.in" },
    { name: "Dishon", team: "Support - Voice Team", email: "dishon_h@lmes.in" },
];

export const teams = [...new Set(initiators.map(i => i.team))];

export const schoolSections = [
    "CMS - Tamil / Level 1 Junior",
    "CMS - Tamil / Level 1 Senior",
    "CMS - Tamil / Level 2 Junior",
    "CMS - Tamil / Level 2 Senior",
    "CMS - PAN India / Junior",
    "CMS - PAN India / Senior",
];

export enum Status {
    ON_HOLD = "On hold",
    ADDED = "Added",
    PENDING = "Pending",
    REFUNDED = "Refunded",
    DISCONTINUED = "Discontinued"
}
