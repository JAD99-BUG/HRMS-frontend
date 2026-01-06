import React, { useState, useEffect, useMemo } from 'react';
import { Users, Building2, Calendar, Wallet } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { dashboardAPI } from '../services/api';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${color} shadow-lg shadow-opacity-20`}>
      <Icon size={24} className="text-white" />
    </div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeEmployees: 0,
    totalDepts: 0,
    activeLeaveCount: 0,
    totalPayroll: 0,
    payrollTrends: []
  });
  const [deptData, setDeptData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, deptRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getDepartments()
        ]);
        setStats(statsRes.data);
        setDeptData(deptRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const deptChartData = useMemo(() => {
    return deptData.map(d => ({
      name: d.name.substring(0, 4),
      staff: d.staff || 0
    }));
  }, [deptData]);

  const payrollTrendData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get current date to determine which months to show
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Create array for last 6 months
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthName = monthNames[month];
      
      // Find matching payroll data for this month/year
      const payrollData = stats.payrollTrends?.find(
        p => p.month === (month + 1) && p.year === year
      );
      
      last6Months.push({
        name: monthName,
        salary: payrollData ? parseFloat(payrollData.total) || 0 : 0
      });
    }
    
    return last6Months;
  }, [stats.payrollTrends]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Active Employees" value={stats.activeEmployees} color="bg-blue-600" />
        <StatCard icon={Building2} label="Departments" value={stats.totalDepts} color="bg-indigo-600" />
        <StatCard icon={Calendar} label="Active Leave" value={stats.activeLeaveCount} color="bg-emerald-600" />
        <StatCard icon={Wallet} label="Monthly Payroll" value={`$${stats.totalPayroll?.toLocaleString() || 0}`} color="bg-violet-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Payroll Trends</h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Last 6 Months</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payrollTrendData}>
                <defs>
                  <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => `$${parseFloat(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <Area type="monotone" dataKey="salary" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSalary)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Department Staffing</h3>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Current Distribution</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="staff" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;







