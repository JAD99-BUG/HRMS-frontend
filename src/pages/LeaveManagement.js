import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Check, X, Search, Clock, Calendar, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { leaveAPI, employeesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RoleType, LeaveStatus, EmployeeStatus } from '../utils/constants';

const LeaveManagement = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('status');
  const [loading, setLoading] = useState(true);
  
  const [newRequest, setNewRequest] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const isManager = user?.role === RoleType.MANAGER;
  const canApprove = user?.role === RoleType.HR_MANAGER || user?.role === RoleType.ADMIN;

  // Format date to remove time portion (YYYY-MM-DD format)
  const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // If it contains time (ISO format), extract just the date part
    if (typeof dateString === 'string' && dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    // If it's a Date object, format it
    if (dateString instanceof Date) {
      return dateString.toISOString().split('T')[0];
    }
    // Try to parse and format
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // If parsing fails, return original string
    }
    return dateString;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
        const [reqRes, typesRes, empRes] = await Promise.all([
          leaveAPI.getRequests(params),
          leaveAPI.getTypes(),
          employeesAPI.getAll()
        ]);
        console.log('Leave Types:', typesRes.data);
        console.log('Employees:', empRes.data);
        setRequests(reqRes.data || []);
        setLeaveTypes(typesRes.data || []);
        setEmployees(empRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        console.error('Error details:', error.response?.data || error.message);
        alert('Error loading data: ' + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [statusFilter]);

  const updateStatus = async (id, status) => {
    if (!canApprove) return;
    try {
      await leaveAPI.update(id, { status, approved_by_user_id: user.user_id });
      setRequests(prev => prev.map(r => r.leave_request_id === id ? { ...r, status } : r));
    } catch (error) {
      console.error('Error updating leave request:', error);
      alert(error.response?.data?.error || 'Error updating leave request');
    }
  };

  const handleAddRequest = async (e) => {
    e.preventDefault();
    try {
      const response = await leaveAPI.create(newRequest);
      const emp = employees.find(e => e.employee_id === Number(newRequest.employee_id));
      const type = leaveTypes.find(t => t.leave_type_id === Number(newRequest.leave_type_id));
      
      const request = {
        ...response.data,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        leave_type_name: type?.name || 'ANNUAL'
      };

      setRequests(prev => [request, ...prev]);
      setIsModalOpen(false);
      setNewRequest({
        employee_id: '',
        leave_type_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: ''
      });
    } catch (error) {
      alert('Error creating leave request');
    }
  };

  const sortedAndFilteredRequests = useMemo(() => {
    let filtered = requests.filter(req => {
      const employee = employees.find(e => e.employee_id === req.employee_id);
      const matchesDept = isManager ? employee?.department_id === user?.department_id : true;
      return matchesDept;
    });

    if (sortOrder === 'status') {
      const statusPriority = { [LeaveStatus.PENDING]: 0, [LeaveStatus.APPROVED]: 1, [LeaveStatus.REJECTED]: 2, [LeaveStatus.CANCELLED]: 3 };
      filtered.sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99));
    } else {
      filtered.sort((a, b) => new Date(b.submitted_on) - new Date(a.submitted_on));
    }

    return filtered;
  }, [requests, sortOrder, isManager, user, employees]);

  // Filter to show only active employees with active employment assignments
  const availableEmployees = (isManager 
    ? employees.filter(e => e.department_id === user?.department_id && e.status === EmployeeStatus.ACTIVE && e.assignment_id)
    : employees.filter(e => e.status === EmployeeStatus.ACTIVE && e.assignment_id)
  );

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === s ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="status">Sort by Status</option>
            <option value="date">Sort by Date</option>
          </select>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 font-bold transition-all"
          >
            <Plus size={20} />
            <span>New Request</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Leave Requests List</h3>
              <span className="text-xs text-slate-400 font-bold">{sortedAndFilteredRequests.length} Requests Found</span>
            </div>
            <div className="divide-y divide-slate-100">
              {sortedAndFilteredRequests.map((req) => (
                <div key={req.leave_request_id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-slate-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      {req.employee_name?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{req.employee_name}</p>
                      <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5 font-medium">
                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{req.leave_type_name}</span>
                        <span>•</span>
                        <span>Submitted on {formatDateOnly(req.submitted_on)}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 italic">"{req.reason}"</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center sm:text-right">
                      <p className="text-sm font-bold text-slate-700">{formatDateOnly(req.start_date)} → {formatDateOnly(req.end_date)}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Duration Window</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {req.status === LeaveStatus.PENDING && canApprove ? (
                        <>
                          <button 
                            onClick={() => updateStatus(req.leave_request_id, LeaveStatus.APPROVED)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full border border-emerald-100 transition-colors shadow-sm"
                            title="Approve"
                          >
                            <Check size={20} />
                          </button>
                          <button 
                            onClick={() => updateStatus(req.leave_request_id, LeaveStatus.REJECTED)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full border border-red-100 transition-colors shadow-sm"
                            title="Reject"
                          >
                            <X size={20} />
                          </button>
                        </>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          req.status === LeaveStatus.APPROVED ? 'bg-emerald-100 text-emerald-800' :
                          req.status === LeaveStatus.REJECTED ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {sortedAndFilteredRequests.length === 0 && (
                <div className="p-16 text-center text-slate-400">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar size={32} className="opacity-20" />
                  </div>
                  <p className="font-medium">No matching leave requests found.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center space-x-2 text-slate-700">
              <Clock size={18} className="text-blue-600" />
              <span>Department Stats</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-sm text-slate-500 font-medium">Pending Approvals</span>
                <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-md font-bold text-xs">{requests.filter(r => r.status === LeaveStatus.PENDING).length}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-sm text-slate-500 font-medium">Approved this Month</span>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md font-bold text-xs">{requests.filter(r => r.status === LeaveStatus.APPROVED).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">Request Time Off</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={handleAddRequest}>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Employee</label>
                  <select required value={newRequest.employee_id} onChange={e => setNewRequest({...newRequest, employee_id: Number(e.target.value)})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium">
                    <option value="">Select Employee</option>
                    {availableEmployees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Leave Type</label>
                  <select required value={newRequest.leave_type_id} onChange={e => setNewRequest({...newRequest, leave_type_id: Number(e.target.value)})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium">
                    <option value="">Select Leave Type</option>
                    {leaveTypes.length > 0 ? (
                      leaveTypes.map(type => (
                        <option key={type.leave_type_id} value={type.leave_type_id}>{type.name}</option>
                      ))
                    ) : (
                      <option value="" disabled>No leave types available</option>
                    )}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                    <input required type="date" value={newRequest.start_date} onChange={e => setNewRequest({...newRequest, start_date: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
                    <input required type="date" value={newRequest.end_date} onChange={e => setNewRequest({...newRequest, end_date: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Reason</label>
                  <textarea required value={newRequest.reason} onChange={e => setNewRequest({...newRequest, reason: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 bg-slate-50 font-medium" placeholder="Briefly explain the reason..." />
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;

