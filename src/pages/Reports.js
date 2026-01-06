import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Download, Printer, Clock, Wallet, Building2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { reportsAPI } from '../services/api';

const COLORS = ['#2563eb', '#4f46e5', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b'];

const Reports = () => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [attendanceData, setAttendanceData] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [payrollData, setPayrollData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attRes, payRes, deptRes] = await Promise.all([
          reportsAPI.getAttendance(),
          reportsAPI.getPayroll(),
          reportsAPI.getDepartments()
        ]);
        // Handle both old format (array) and new format (object with attendanceData and totalEmployees)
        if (attRes.data && typeof attRes.data === 'object' && !Array.isArray(attRes.data)) {
          setAttendanceData(attRes.data.attendanceData || []);
          setTotalEmployees(attRes.data.totalEmployees || 0);
        } else {
          setAttendanceData(attRes.data || []);
          // If old format, calculate total from distinct employees in attendance data
          const distinctEmployees = new Set(
            (attRes.data || []).filter(r => r.employee_id).map(r => r.employee_id)
          ).size;
          setTotalEmployees(distinctEmployees);
        }
        setPayrollData(payRes.data);
        setDepartmentData(deptRes.data);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="opacity-30 group-hover:opacity-100" />;
    return sortOrder === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />;
  };

  const getSortedData = (data) => {
    return [...data].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === 'date' || sortField === 'payment_date') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      }
      
      if (sortField === 'name') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const renderAttendanceReport = () => {
    const data = getSortedData(attendanceData);
    
    // Process attendance data to create chart data grouped by day of week
    const getDayOfWeek = (dateString) => {
      const date = new Date(dateString);
      const day = date.getDay();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[day];
    };

    // Initialize day counts - will store sets of unique employee IDs per day
    const dayEmployeeSets = {
      'Mon': new Set(),
      'Tue': new Set(),
      'Wed': new Set(),
      'Thu': new Set(),
      'Fri': new Set(),
      'Sat': new Set(),
      'Sun': new Set()
    };

    // Count distinct employees with PRESENT records by day of week
    // Group by employee_id, day/month/year to count unique employees per day
    attendanceData.forEach(record => {
      if (record.status === 'PRESENT' && record.date && record.employee_id) {
        const day = getDayOfWeek(record.date);
        if (dayEmployeeSets.hasOwnProperty(day)) {
          // Use employee_id to ensure we count distinct employees
          dayEmployeeSets[day].add(record.employee_id);
        }
      }
    });

    // Convert sets to counts (number of distinct employees per day)
    const dayCounts = {
      'Mon': dayEmployeeSets['Mon'].size,
      'Tue': dayEmployeeSets['Tue'].size,
      'Wed': dayEmployeeSets['Wed'].size,
      'Thu': dayEmployeeSets['Thu'].size,
      'Fri': dayEmployeeSets['Fri'].size,
      'Sat': dayEmployeeSets['Sat'].size,
      'Sun': dayEmployeeSets['Sun'].size
    };

    // Convert to chart data format (only weekdays for now, but include all days)
    const chartData = [
      { day: 'Mon', present: dayCounts['Mon'] },
      { day: 'Tue', present: dayCounts['Tue'] },
      { day: 'Wed', present: dayCounts['Wed'] },
      { day: 'Thu', present: dayCounts['Thu'] },
      { day: 'Fri', present: dayCounts['Fri'] },
      { day: 'Sat', present: dayCounts['Sat'] },
      { day: 'Sun', present: dayCounts['Sun'] }
    ];

    // Calculate average presence rate based on distinct employees
    // Count distinct employees with attendance records
    const distinctEmployeesWithAttendance = new Set(
      attendanceData
        .filter(r => r.status === 'PRESENT' && r.employee_id)
        .map(r => r.employee_id)
    ).size;
    
    // Use totalEmployees from backend, or fallback to distinct employees in dataset
    const totalEmployeesForRate = totalEmployees > 0 
      ? totalEmployees 
      : new Set(attendanceData.filter(r => r.employee_id).map(r => r.employee_id)).size;
    
    const averagePresenceRate = totalEmployeesForRate > 0 
      ? ((distinctEmployeesWithAttendance / totalEmployeesForRate) * 100).toFixed(1) 
      : '0.0';

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center space-x-2 text-slate-800">
                <Clock className="text-blue-600" size={20} />
                <span>Attendance Distribution</span>
              </h3>
              {totalEmployees > 0 && (
                <span className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                  Total Employees: {totalEmployees}
                </span>
              )}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, Math.max(totalEmployees || 1, ...chartData.map(d => d.present || 0), 1)]}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    formatter={(value) => {
                      const presentCount = value || 0;
                      const percentage = totalEmployees > 0 ? ((presentCount / totalEmployees) * 100).toFixed(1) : 0;
                      return [`${presentCount} / ${totalEmployees} employees (${percentage}%)`, 'Present'];
                    }}
                  />
                  <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                <span className="text-sm font-bold text-emerald-600 uppercase tracking-tighter">Average Presence Rate</span>
                <span className="text-2xl font-black text-emerald-900">{averagePresenceRate}%</span>
              </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-bold text-slate-800">Attendance Log</h4>
              <span className="text-xs text-slate-400 font-bold">Sorted by: {sortField}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('name')}>
                    <div className="flex items-center space-x-2"><span>Employee</span><SortIcon field="name" /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('date')}>
                    <div className="flex items-center space-x-2"><span>Date</span><SortIcon field="date" /></div>
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Work Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{item.name}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{item.date}</td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{item.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 text-right font-mono">{item.hours || 'N/A'}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">No attendance data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPayrollReport = () => {
    const data = getSortedData(payrollData);
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-6 flex items-center space-x-2 text-slate-800">
            <Wallet className="text-indigo-600" size={20} />
            <span>Expenditure Analysis</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[ { m: 'Oct', t: 42000 }, { m: 'Nov', t: 44500 }, { m: 'Dec', t: 48000 } ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="m" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Line type="monotone" dataKey="t" stroke="#4f46e5" strokeWidth={4} dot={{r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Payroll Disbursement Log</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('name')}>
                    <div className="flex items-center space-x-2"><span>Employee</span><SortIcon field="name" /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('payment_date')}>
                    <div className="flex items-center space-x-2"><span>Payment Date</span><SortIcon field="payment_date" /></div>
                  </th>
                  <th className="px-6 py-4 text-right cursor-pointer group" onClick={() => handleSort('net_paid')}>
                    <div className="flex items-center justify-end space-x-2"><span>Net Paid</span><SortIcon field="net_paid" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{item.name}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{item.payment_date}</td>
                    <td className="px-6 py-4 font-black text-slate-900 text-right font-mono">${(item.net_paid || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400">No payroll data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDepartmentReport = () => {
    const data = getSortedData(departmentData);
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-6 flex items-center space-x-2 text-slate-800">
                <Building2 className="text-blue-600" size={20} />
                <span>Personnel Distribution</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={departmentData.map(d => ({ name: d.name, value: d.staff_count || 0 }))} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {COLORS.map((c, i) => <Cell key={i} fill={c} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Efficiency Ranking</h4>
                <FileText size={18} className="text-blue-600" />
              </div>
              <div className="space-y-4">
                {[...departmentData].sort((a,b) => (b.budget || 0) - (a.budget || 0)).slice(0,3).map((d, i) => (
                  <div key={d.department_id || i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">{i+1}</span>
                        <span className="font-bold text-slate-700">{d.name}</span>
                    </div>
                    <span className="font-mono text-blue-600 font-black">${(d.budget || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Departmental Comparison</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('name')}>
                    <div className="flex items-center space-x-2"><span>Department</span><SortIcon field="name" /></div>
                  </th>
                  <th className="px-6 py-4 text-center cursor-pointer group" onClick={() => handleSort('staff_count')}>
                    <div className="flex items-center justify-center space-x-2"><span>Total Staff</span><SortIcon field="staff_count" /></div>
                  </th>
                  <th className="px-6 py-4 text-right cursor-pointer group" onClick={() => handleSort('budget')}>
                    <div className="flex items-center justify-end space-x-2"><span>Annual Budget</span><SortIcon field="budget" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {data.map((dept) => (
                  <tr key={dept.department_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{dept.name}</td>
                    <td className="px-6 py-4 text-center text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded-md font-bold">{dept.staff_count || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-800 font-mono">${(dept.budget || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400">No department data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {['attendance', 'payroll', 'departments'].map((t) => (
            <button 
              key={t}
              onClick={() => { setActiveTab(t); setSortField(t === 'departments' ? 'name' : 'date'); }}
              className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === t ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <span className="capitalize">{t}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 text-slate-600 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
            <Printer size={16} />
            <span>Print Report</span>
          </button>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'attendance' && renderAttendanceReport()}
        {activeTab === 'payroll' && renderPayrollReport()}
        {activeTab === 'departments' && renderDepartmentReport()}
      </div>
    </div>
  );
};

export default Reports;







