
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
  remindersSent?: string[]; // e.g. ['prev_day', 'morning', 'evening']
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
    { name: "Jaya Shri P", team: "Operations", email: "operation@lmes.in" },
    { name: "Nagaraj S", team: "Operations", email: "operation@lmes.in" },
    { name: "P S Shalini", team: "Operations", email: "operation@lmes.in" },
    { name: "Abirama Sundari K", team: "Operations", email: "operation@lmes.in" },
    { name: "Gokul Samraj", team: "Operations", email: "operation@lmes.in" },
    { name: "Sivasankaran R", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Sakthivel Elumalai", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Mani Bharathi C", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Charulatha S", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Sivaprakash S", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Bharathi R", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Sansi Stafina", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Dharshini", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Vinoth Kumar", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Srinath M", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Arthi M", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "Porselvan", team: "Support - Voice Team", email: "operation@lmes.in" },
    { name: "SivaPriya G", team: "Retention Team", email: "operation@lmes.in" },
    { name: "Naveena R", team: "Retention Team", email: "operation@lmes.in" },
    { name: "Abishek", team: "Support - Non Voice Team", email: "operation@lmes.in" },
    { name: "Abdul", team: "Support - Non Voice Team", email: "operation@lmes.in" },
    { name: "Ananthi", team: "Support - Non Voice Team", email: "operation@lmes.in" },
    { name: "karthick Varun", team: "Support - Non Voice Team", email: "operation@lmes.in" },
    { name: "Deepika", team: "Support - Non Voice Team", email: "operation@lmes.in" },
    { name: "Ririth", team: "Support - Non Voice Team", email: "operation@lmes.in" },
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
