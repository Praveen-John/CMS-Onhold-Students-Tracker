
import React, { useEffect, useRef, useState } from 'react';
import type { Student } from '../types';
import { initiators, Status, teams, schoolSections } from '../types';
import { generateReasonSuggestion } from '../services/geminiService';
import { SparklesIcon, LoaderIcon, ExclamationCircleIcon, CheckCircleIcon, CloseIcon } from './icons';

interface StudentFormProps {
  onAddStudent?: (student: Student) => void;
  onSave?: (student: Student) => void;
  existingStudents: Student[];
  initialData?: Student | null;
  isEditing?: boolean;
}

const todayIsoDate = () => new Date().toISOString().split('T')[0];

const initialFormState: Omit<Student, 'id'> = {
  initiatedDate: todayIsoDate(),
  studentName: '',
  phoneNumber: '',
  registeredMailId: '',
  category: '',
  heldSchoolSection: '',
  changedToSchoolSection: '',
  reminderDate: '',
  initiatedBy: '',
  team: '',
  reasonToHold: '',
  followUpComments: '',
  status: Status.ON_HOLD,
};

const safeUUID = () => {
  try {
    // @ts-ignore
    return crypto?.randomUUID?.() ?? null;
  } catch {
    return null;
  }
};

const StudentForm: React.FC<StudentFormProps> = ({ 
  onAddStudent, 
  onSave, 
  existingStudents, 
  initialData, 
  isEditing = false 
}) => {
  const [formData, setFormData] = useState<Omit<Student, 'id'>>(initialFormState);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Effect to populate form when editing
  useEffect(() => {
    if (isEditing && initialData) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = initialData;
        setFormData(rest);
    }
  }, [isEditing, initialData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const known = initiators.find(i => i.name === formData.initiatedBy);
    if (known && formData.team !== known.team) {
      setFormData(prev => ({ ...prev, team: known.team }));
    }
    if (!formData.initiatedBy) {
      setFormData(prev => ({ ...prev, team: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.initiatedBy]);

  useEffect(() => {
    if (formError) setFormError(null);
    if (successMessage) setSuccessMessage(null);
  }, [formData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInitiatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const initiatorName = e.target.value;
    const knownInitiator = initiators.find(i => i.name === initiatorName);
    setFormData(prev => ({
      ...prev,
      initiatedBy: initiatorName,
      team: knownInitiator ? knownInitiator.team : prev.team, 
    }));
  };

  const handleSuggestReason = async () => {
    setSuggestError(null);
    setIsSuggesting(true);
    try {
      const suggestion = await generateReasonSuggestion(formData);
      if (!mountedRef.current) return;
      if (typeof suggestion === 'string' && suggestion.trim().length > 0) {
        setFormData(prev => ({ ...prev, reasonToHold: suggestion }));
      } else {
        setSuggestError('No suggestion returned.');
      }
    } catch (err: any) {
      setSuggestError(err?.message ?? 'Failed to generate suggestion.');
    } finally {
      if (mountedRef.current) setIsSuggesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Basic Validation
    if (!formData.studentName.trim()) return;
    if (!formData.registeredMailId.trim()) return;
    if (!formData.heldSchoolSection.trim()) return;
    if (!formData.category.trim()) return;

    // --- DUPLICATE CHECK LOGIC ---
    // If editing, exclude the current student from duplicate checks
    const otherStudents = isEditing && initialData 
        ? existingStudents.filter(s => s.id !== initialData.id) 
        : existingStudents;

    const normalizedEmail = formData.registeredMailId.trim().toLowerCase();
    const normalizedPhone = formData.phoneNumber ? formData.phoneNumber.trim().replace(/\D/g, '') : '';

    // 1. Check for Duplicate Email
    const duplicateEmailStudent = otherStudents.find(
      s => (s.registeredMailId || '').trim().toLowerCase() === normalizedEmail
    );

    if (duplicateEmailStudent) {
      setFormError(`Duplicate Entry: A student with email "${formData.registeredMailId}" already exists (Name: ${duplicateEmailStudent.studentName}).`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Check for Duplicate Phone (Only if phone is provided and long enough to be unique)
    if (normalizedPhone.length > 6) { 
      const duplicatePhoneStudent = otherStudents.find(s => {
        const sPhone = s.phoneNumber ? s.phoneNumber.replace(/\D/g, '') : '';
        return sPhone === normalizedPhone;
      });

      if (duplicatePhoneStudent) {
         setFormError(`Duplicate Entry: A student with phone "${formData.phoneNumber}" already exists (Name: ${duplicatePhoneStudent.studentName}).`);
         window.scrollTo({ top: 0, behavior: 'smooth' });
         return;
      }
    }
    // --- END DUPLICATE CHECK ---

    if (isEditing && initialData) {
        // UPDATE MODE
        const updatedStudent: Student = {
            ...formData,
            id: initialData.id,
            createdByEmail: initialData.createdByEmail // Preserve original creator
        };
        if (onSave) onSave(updatedStudent);
        // Note: For editing, we typically don't reset form immediately or show success inside the form
        // because the parent component often navigates back. But we can show success if it stays.
    } else {
        // ADD MODE
        const id = safeUUID() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const newStudent = { ...formData, id };
        
        if (onAddStudent) onAddStudent(newStudent);
        if (onSave) onSave(newStudent); // Alternative prop name
        
        setSuccessMessage(`Successfully added student: ${formData.studentName}`);
        setFormData({ ...initialFormState, initiatedDate: todayIsoDate() });
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSuggestError(null);
  };

  const isKnownInitiator = initiators.some(i => i.name === formData.initiatedBy);
  const isInitiatorEntered = formData.initiatedBy.trim() !== '';

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
      aria-label={isEditing ? "Edit Student" : "Add On-Hold Student"}
    >
      {/* Notifications Area */}
      {formError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start animate-fade-in shadow-sm">
          <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">Cannot {isEditing ? 'Update' : 'Add'} Student</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{formError}</p>
          </div>
          <button 
            type="button"
            onClick={() => setFormError(null)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {successMessage && (
         <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-start animate-fade-in shadow-sm">
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-200">Success</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">{successMessage}</p>
          </div>
           <button 
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* SECTION 1: Student Details */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">Student Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="form-group">
            <label htmlFor="studentName" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Student Name
            </label>
            <input
              type="text"
              id="studentName"
              name="studentName"
              value={formData.studentName}
              onChange={handleChange}
              maxLength={100}
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-2.5"
              required
              aria-required
            />
          </div>

          <div className="form-group">
            <label htmlFor="registeredMailId" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Registered Mail ID
            </label>
            <input
              type="email"
              id="registeredMailId"
              name="registeredMailId"
              value={formData.registeredMailId}
              onChange={handleChange}
              maxLength={100}
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-2.5"
              required
              aria-required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              maxLength={20}
              pattern="^[+0-9][0-9\s\-]{6,19}$"
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-2.5"
            />
          </div>
           <div className="form-group">
            <label htmlFor="initiatedDate" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Initiated Date
            </label>
            <input
              type="date"
              id="initiatedDate"
              name="initiatedDate"
              value={formData.initiatedDate}
              onChange={handleChange}
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-2.5"
              required
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Academic Info */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">Academic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="form-group">
            <label htmlFor="category" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-2.5"
              required
            >
              <option value="">Select a category</option>
              {schoolSections.map(section => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="heldSchoolSection" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Held School / Section
            </label>
            <input
              type="text"
              id="heldSchoolSection"
              name="heldSchoolSection"
              value={formData.heldSchoolSection}
              onChange={handleChange}
              maxLength={50}
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-2.5"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="changedToSchoolSection" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Changed to School / Section
            </label>
            <input
              type="text"
              id="changedToSchoolSection"
              name="changedToSchoolSection"
              value={formData.changedToSchoolSection}
              onChange={handleChange}
              maxLength={50}
              placeholder="Optional"
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-2.5"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: Tracking Status */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">Internal Tracking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="form-group">
            <label htmlFor="initiatedBy" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Initiated By
            </label>
            <input
              list="initiators-list"
              id="initiatedBy"
              name="initiatedBy"
              value={formData.initiatedBy}
              onChange={handleInitiatorChange}
              maxLength={50}
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-2.5"
              placeholder="Type name"
            />
            <datalist id="initiators-list">
              {initiators.map(i => (
                <option key={i.name} value={i.name} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label htmlFor="team" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Team
            </label>
            {isKnownInitiator ? (
              <input
                type="text"
                id="team"
                name="team"
                value={formData.team}
                readOnly
                className="w-full bg-slate-200 dark:bg-slate-800 border border-black dark:border-slate-600 rounded-lg shadow-sm text-slate-600 dark:text-slate-400 cursor-not-allowed p-2.5"
              />
            ) : (
              <select
                id="team"
                name="team"
                value={formData.team}
                onChange={handleChange}
                disabled={!isInitiatorEntered}
                className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:cursor-not-allowed p-2.5"
                required={!!isInitiatorEntered}
              >
                <option value="">Select a team</option>
                {teams.map(team => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="status" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-2.5"
            >
              {Object.values(Status).map(val => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reminderDate" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Reminder Date
            </label>
            <input
              type="date"
              id="reminderDate"
              name="reminderDate"
              value={formData.reminderDate}
              onChange={handleChange}
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-2.5"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: Reason & Notes */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">Notes & Reason</h3>
        <div className="space-y-6">
          <div className="form-group">
            <label htmlFor="reasonToHold" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Reason to Hold
            </label>
            <div className="relative">
              <textarea
                id="reasonToHold"
                name="reasonToHold"
                value={formData.reasonToHold}
                onChange={handleChange}
                rows={4}
                maxLength={1000}
                className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-3 pr-28"
              />
              <button
                type="button"
                onClick={handleSuggestReason}
                disabled={isSuggesting}
                className="absolute top-3 right-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300 dark:focus:ring-offset-slate-800"
              >
                {isSuggesting ? <LoaderIcon className="w-3.5 h-3.5" /> : <SparklesIcon className="w-3.5 h-3.5 mr-1.5" />}
                AI Suggest
              </button>
            </div>
            <div className="mt-1 h-4 text-xs">
              {suggestError && <span className="text-red-500">{suggestError}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="followUpComments" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Follow Up Comments
            </label>
            <textarea
              id="followUpComments"
              name="followUpComments"
              value={formData.followUpComments}
              onChange={handleChange}
              rows={3}
              maxLength={1000}
              className="w-full bg-white dark:bg-slate-900 border border-black dark:border-slate-600 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-slate-200 p-3"
              placeholder="Add any follow-up notes here..."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-slate-800 transform transition hover:-translate-y-0.5"
        >
          {isEditing ? 'Update Student Record' : 'Save Student Record'}
        </button>
      </div>
    </form>
  );
};

export default StudentForm;