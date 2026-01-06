import React, { useState, useEffect } from 'react';
import { Search, Download, Upload, Edit3, X, Clock, Calendar } from 'lucide-react';
import { attendanceAPI, employeesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RoleType, AttendanceMark } from '../utils/constants';

const Attendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const isManager = user?.role === RoleType.MANAGER;
  const canEdit = user?.role !== RoleType.MANAGER && user?.role !== RoleType.HR_ASSISTANT;

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      // If a specific date is chosen, use it; otherwise use month/year like payroll
      if (dateFilter) {
        params.date = dateFilter;
      } else {
        params.month = month;
        params.year = year;
      }
      const [attRes, empRes] = await Promise.all([
        attendanceAPI.getAll(params),
        employeesAPI.getAll()
      ]);
      setRecords(attRes.data || []);
      setEmployees(empRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading attendance data: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, month, year]);

  const filteredRecords = records.filter(r => {
    const employee = employees.find(e => e.employee_id === r.employee_id);
    const matchesDept = isManager ? employee?.department_id === user?.department_id : true;
    const matchesSearch = (r.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  // Format date to remove time portion (YYYY-MM-DD only)
  const formatDateOnly = (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    // If it contains 'T', split and take only the date part
    if (str.includes('T')) {
      return str.split('T')[0];
    }
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    // Try to parse as date and extract YYYY-MM-DD
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return str;
  };

  // Normalize time to HH:MM format (24-hour, no seconds, no AM/PM)
  const normalizeTimeValue = (timeStr) => {
    if (!timeStr) return null;
    
    // Convert to string if not already
    let str = String(timeStr).trim();
    
    // Remove any AM/PM indicators first
    str = str.replace(/\s*(AM|PM|am|pm)/i, '');
    
    // Handle ISO format like "T22:00:00.000Z" or "2024-01-01T22:00:00.000Z"
    const isoTimeMatch = str.match(/T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z?/i);
    if (isoTimeMatch) {
      const hours = isoTimeMatch[1];
      const minutes = isoTimeMatch[2];
      return `${hours}:${minutes}`;
    }
    
    // If already in HH:MM format (24-hour), return as is
    if (/^\d{1,2}:\d{2}$/.test(str)) {
      const parts = str.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      // Ensure hours are 0-23 for 24-hour format
      if (hours >= 0 && hours <= 23) {
        return `${String(hours).padStart(2, '0')}:${minutes}`;
      }
    }
    
    // If in HH:MM:SS format, extract HH:MM
    if (/^\d{1,2}:\d{2}:\d{2}/.test(str)) {
      const parts = str.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      if (hours >= 0 && hours <= 23) {
        return `${String(hours).padStart(2, '0')}:${minutes}`;
      }
    }
    
    // Try to parse and format
    const parts = str.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      if (hours >= 0 && hours <= 23) {
        return `${String(hours).padStart(2, '0')}:${minutes}`;
      }
    }
    
    return str;
  };

  const handleEdit = (record) => {
    // Normalize time values to HH:MM format when opening edit modal
    const normalizedRecord = {
      ...record,
      check_in: normalizeTimeValue(record.check_in),
      check_out: normalizeTimeValue(record.check_out)
    };
    setEditingRecord(normalizedRecord);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // Normalize time values to HH:MM format before saving
      const normalizedCheckIn = normalizeTimeValue(editingRecord.check_in);
      const normalizedCheckOut = normalizeTimeValue(editingRecord.check_out);
      
      await attendanceAPI.update(editingRecord.attendance_id, {
        check_in: normalizedCheckIn,
        check_out: normalizedCheckOut,
        mark: editingRecord.mark,
        notes: editingRecord.notes
      });
      
      // Update local state with normalized values
      const updatedRecord = {
        ...editingRecord,
        check_in: normalizedCheckIn,
        check_out: normalizedCheckOut
      };
      setRecords(prev => prev.map(r => r.attendance_id === editingRecord.attendance_id ? updatedRecord : r));
      setIsEditModalOpen(false);
    } catch (error) {
      alert('Error updating attendance');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await attendanceAPI.importFile(file);
      const stats = res.data || {};
      alert(
        `Import completed!\n\n` +
        `Total rows read: ${stats.total_rows_read || 0}\n` +
        `Valid rows: ${stats.valid_rows || 0}\n` +
        `Inserted records: ${stats.inserted_records || 0}\n` +
        `Updated records: ${stats.updated_records || 0}\n` +
        `Skipped invalid employee: ${stats.skipped_invalid_employee || 0}\n` +
        `Skipped empty rows: ${stats.skipped_empty_rows || 0}`
      );
      // Refresh attendance data for the current month/year
      await fetchData();
      // Reset file input so same file can be reselected if needed
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading attendance Excel:', error);
      alert('Error uploading attendance Excel: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {!isManager && (
            <label className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-sm">
              <Upload size={20} className="text-blue-600" />
              <span className="font-medium">
                {uploading ? 'Uploading...' : 'Upload Excel'}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          )}
          <button className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={20} className="text-slate-500" />
            <span className="font-medium">Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search employee..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Month/year filters similar to payroll */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Calendar size={18} className="text-slate-500" />
              <select
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'short' })}
                  </option>
                ))}
              </select>
            </div>
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
            >
              {Array.from({ length: 5 }).map((_, idx) => {
                const y = new Date().getFullYear() - 2 + idx;
                return (
                  <option key={y} value={y}>{y}</option>
                );
              })}
            </select>
          </div>

          {/* Optional exact date override */}
          <input
            type="date"
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Check In</th>
                <th className="px-6 py-4">Check Out</th>
                <th className="px-6 py-4 text-center">Work Hrs</th>
                <th className="px-6 py-4 text-center">Variance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => (
                <tr key={record.attendance_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{formatDateOnly(record.attendance_date)}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{record.employee_name}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-sm">{normalizeTimeValue(record.check_in) || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-sm">{normalizeTimeValue(record.check_out) || 'N/A'}</td>
                  <td className="px-6 py-4 text-center font-medium text-slate-700">{record.working_hours || 0}h</td>
                  <td className="px-6 py-4 text-center">
                    <span className={record.hour_variance < 0 ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>
                      {record.hour_variance > 0 ? '+' : ''}{record.hour_variance || 0}h
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      record.mark === AttendanceMark.PRESENT ? 'bg-emerald-100 text-emerald-800' :
                      record.mark === AttendanceMark.LATE ? 'bg-amber-100 text-amber-800' :
                      record.mark === AttendanceMark.ABSENT ? 'bg-red-100 text-red-800' :
                      record.mark === AttendanceMark.ANNUAL_LEAVE ? 'bg-blue-100 text-blue-800' :
                      record.mark === AttendanceMark.SICK_LEAVE ? 'bg-purple-100 text-purple-800' :
                      record.mark === AttendanceMark.OFF ? 'bg-slate-100 text-slate-800' :
                      record.mark === AttendanceMark.PERMISSION ? 'bg-yellow-100 text-yellow-800' :
                      record.mark === AttendanceMark.PUBLIC_HOLIDAY ? 'bg-indigo-100 text-indigo-800' :
                      record.mark === AttendanceMark.EARLY_LEAVE ? 'bg-orange-100 text-orange-800' :
                      record.mark === AttendanceMark.HALF_DAY ? 'bg-cyan-100 text-cyan-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {record.mark}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canEdit && (
                      <button 
                        onClick={() => handleEdit(record)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">No attendance records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isEditModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit Attendance Record</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase">Employee</p>
                <p className="font-bold text-slate-800">{editingRecord.employee_name}</p>
                <p className="text-xs text-slate-500">{formatDateOnly(editingRecord.attendance_date)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Time In</label>
                  <input 
                    type="text" 
                    pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                    placeholder="17:00"
                    value={editingRecord.check_in || ''} 
                    onChange={e => {
                      let timeValue = e.target.value;
                      // Allow only digits and colon, format as user types
                      timeValue = timeValue.replace(/[^\d:]/g, '');
                      
                      // Auto-format to HH:MM as user types
                      if (timeValue.length > 0 && !timeValue.includes(':')) {
                        if (timeValue.length <= 2) {
                          // Just hours typed
                          timeValue = timeValue;
                        } else if (timeValue.length === 3) {
                          // Add colon after 2 digits
                          timeValue = timeValue.substring(0, 2) + ':' + timeValue.substring(2);
                        } else if (timeValue.length > 3) {
                          // Format as HH:MM
                          const hours = timeValue.substring(0, 2);
                          const minutes = timeValue.substring(2, 4);
                          timeValue = hours + ':' + minutes;
                        }
                      }
                      
                      // Limit to valid format
                      if (timeValue.length <= 5) {
                        setEditingRecord({...editingRecord, check_in: timeValue});
                      }
                    }}
                    onBlur={e => {
                      // Normalize on blur to ensure proper format
                      const normalized = normalizeTimeValue(e.target.value);
                      setEditingRecord({...editingRecord, check_in: normalized || ''});
                    }}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Time Out</label>
                  <input 
                    type="text" 
                    pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                    placeholder="17:00"
                    value={editingRecord.check_out || ''} 
                    onChange={e => {
                      let timeValue = e.target.value;
                      // Allow only digits and colon, format as user types
                      timeValue = timeValue.replace(/[^\d:]/g, '');
                      
                      // Auto-format to HH:MM as user types
                      if (timeValue.length > 0 && !timeValue.includes(':')) {
                        if (timeValue.length <= 2) {
                          // Just hours typed
                          timeValue = timeValue;
                        } else if (timeValue.length === 3) {
                          // Add colon after 2 digits
                          timeValue = timeValue.substring(0, 2) + ':' + timeValue.substring(2);
                        } else if (timeValue.length > 3) {
                          // Format as HH:MM
                          const hours = timeValue.substring(0, 2);
                          const minutes = timeValue.substring(2, 4);
                          timeValue = hours + ':' + minutes;
                        }
                      }
                      
                      // Limit to valid format
                      if (timeValue.length <= 5) {
                        setEditingRecord({...editingRecord, check_out: timeValue});
                      }
                    }}
                    onBlur={e => {
                      // Normalize on blur to ensure proper format
                      const normalized = normalizeTimeValue(e.target.value);
                      setEditingRecord({...editingRecord, check_out: normalized || ''});
                    }}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Status Mark</label>
                <select value={editingRecord.mark} onChange={e => setEditingRecord({...editingRecord, mark: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                  {Object.values(AttendanceMark).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;




