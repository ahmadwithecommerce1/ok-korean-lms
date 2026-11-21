import React, { useState } from 'react';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { doc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { StorageService } from '../services/storageService';
import { Student } from '../types';

interface ClearAllStudentsButtonProps {
  onSuccess?: () => void;
  className?: string;
  buttonText?: string;
  showIcon?: boolean;
}

/**
 * ClearAllStudentsButton
 * 
 * Provides a clean utility button to delete all existing student records
 * from Firebase Firestore and local storage for a fresh start.
 * 
 * Includes confirmation popup:
 * "Are you sure you want to permanently delete all student records?"
 */
export const ClearAllStudentsButton: React.FC<ClearAllStudentsButtonProps> = ({
  onSuccess,
  className = '',
  buttonText = 'Clear All Students',
  showIcon = true,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Core deletion: loops through students and deletes each document from Firebase
  const handleDeleteAllFromFirebase = async () => {
    setIsDeleting(true);
    try {
      // 1. Get current list of students
      const currentStudents: Student[] = StorageService.getStudents();

      // 2. Loop through the existing students and delete them from Firebase Firestore
      for (const student of currentStudents) {
        if (student?.id) {
          try {
            await deleteDoc(doc(db, 'students', student.id));
          } catch (err) {
            console.warn(`Failed to delete student ${student.id} from Firebase:`, err);
          }
        }
      }

      // Also query the 'students' collection to ensure any orphan documents in Firestore are removed
      try {
        const snap = await getDocs(collection(db, 'students'));
        for (const docSnap of snap.docs) {
          try {
            await deleteDoc(doc(db, 'students', docSnap.id));
          } catch (e) {
            console.warn(`Failed to delete document ${docSnap.id}:`, e);
          }
        }
      } catch (e) {
        console.warn('Collection sweep warning:', e);
      }

      // 3. Reset storage cache & notify subscribers so UI updates to show 0 students immediately
      await StorageService.clearAllStudents();

      // 4. Notify parent component to update state to 0 students
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error deleting students from Firebase:', error);
    } finally {
      setIsDeleting(false);
      setShowConfirmModal(false);
    }
  };

  const handleClick = () => {
    // Show standard confirmation popup before deleting
    const confirmed = window.confirm("Are you sure you want to permanently delete all student records?");
    if (confirmed) {
      handleDeleteAllFromFirebase();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDeleting}
        className={
          className ||
          "inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        }
        title="Permanently delete all students from Firebase database for a fresh start"
      >
        {isDeleting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Deleting from Firebase...</span>
          </>
        ) : (
          <>
            {showIcon && <Trash2 className="w-4 h-4" />}
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {/* Optional fallback in-app modal confirmation dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30">
                <AlertTriangle className="w-6 h-6 text-rose-500 dark:text-rose-400" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Delete All Student Records</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Are you sure you want to permanently delete all student records?
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllFromFirebase}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Delete All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClearAllStudentsButton;
