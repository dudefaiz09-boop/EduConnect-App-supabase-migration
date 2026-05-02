import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Clock, Search, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

interface Student {
  uid: string;
  displayName: string;
  email: string;
}

export const AttendancePage = () => {
  const { role, isTeacher, user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isTeacher) {
      // Fetch all students
      const fetchStudents = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'student'));
          const snapshot = await getDocs(q);
          setStudents(snapshot.docs.map(doc => doc.data() as Student));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      };
      fetchStudents();
    }

    // Fetch attendance for selected date
    const q = isTeacher 
      ? query(collection(db, 'attendance'), where('date', '==', selectedDate))
      : query(collection(db, 'attendance'), where('studentId', '==', user?.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceRecord[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate, isTeacher, user?.uid]);

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    try {
      // Small optimization: check if existing record exists for this student on this date
      // For simplicity in this demo, we just add a new doc or update 
      // But firestore rules will validate. 
      await addDoc(collection(db, 'attendance'), {
        studentId,
        date: selectedDate,
        status,
        markedBy: user?.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    }
  };

  const getStatus = (studentId: string) => {
    return records.find(r => r.studentId === studentId)?.status;
  };

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance</h1>
          <p className="text-slate-500 mt-1">Manage and track student presence daily.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-slate-200 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium text-slate-700 shadow-sm"
          />
        </div>
      </div>

      {isTeacher ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border-none pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const status = getStatus(student.uid);
                  return (
                    <tr key={student.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                            {student.displayName?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{student.displayName}</p>
                            <p className="text-xs text-slate-400">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {status ? (
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize",
                            status === 'present' ? "bg-emerald-50 text-emerald-600" :
                            status === 'absent' ? "bg-red-50 text-red-600" :
                            "bg-amber-50 text-amber-600"
                          )}>
                            {status === 'present' && <CheckCircle2 size={12} />}
                            {status === 'absent' && <XCircle size={12} />}
                            {status === 'late' && <Clock size={12} />}
                            {status}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-300 italic">Not marked</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => markAttendance(student.uid, 'present')}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              status === 'present' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                            )}
                            title="Present"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button 
                            onClick={() => markAttendance(student.uid, 'absent')}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              status === 'absent' ? "bg-red-600 text-white shadow-lg shadow-red-200" : "bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            )}
                            title="Absent"
                          >
                            <XCircle size={18} />
                          </button>
                          <button 
                            onClick={() => markAttendance(student.uid, 'late')}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              status === 'late' ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                            )}
                            title="Late"
                          >
                            <Clock size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           <h2 className="text-xl font-bold text-slate-900">My Attendance History</h2>
           {records.length === 0 ? (
             <div className="bg-white p-12 rounded-3xl text-center text-slate-400 border border-slate-100">
               No records found for your account.
             </div>
           ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {records.map((record) => (
                  <div key={record.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">{record.date}</p>
                      <div className={cn(
                        "text-sm font-bold capitalize transition-colors",
                        record.status === 'present' ? "text-emerald-600" :
                        record.status === 'absent' ? "text-red-600" :
                        "text-amber-600"
                      )}>
                        {record.status}
                      </div>
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center opacity-80",
                      record.status === 'present' ? "bg-emerald-50 text-emerald-600" :
                      record.status === 'absent' ? "bg-red-50 text-red-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                       {record.status === 'present' && <CheckCircle2 size={20} />}
                       {record.status === 'absent' && <XCircle size={20} />}
                       {record.status === 'late' && <Clock size={20} />}
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};
