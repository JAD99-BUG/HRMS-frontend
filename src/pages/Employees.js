import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, UserMinus, X, Paperclip } from 'lucide-react';
import { employeesAPI, departmentsAPI, positionsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RoleType, EmployeeStatus, BLOOD_TYPES } from '../utils/constants';

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [view, setView] = useState('ACTIVE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});

  const isManager = user?.role === RoleType.MANAGER;
  const canModify = user?.role === RoleType.HR_MANAGER || user?.role === RoleType.ADMIN;

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, deptRes, posRes] = await Promise.all([
          employeesAPI.getAll(),
          departmentsAPI.getAll(),
          positionsAPI.getAll()
        ]);
        setEmployees(empRes.data);
        setDepartments(deptRes.data);
        setPositions(posRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleResign = async (id) => {
    if (!canModify) return;
    if (!confirm('Are you sure you want to terminate this employee?')) return;
    try {
      await employeesAPI.delete(id);
      setEmployees(prev => prev.map(emp => 
        emp.employee_id === id ? { ...emp, status: EmployeeStatus.TERMINATED } : emp
      ));
    } catch (error) {
      alert('Error terminating employee');
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      status: EmployeeStatus.ACTIVE,
      blood_type: 'O+',
      department_id: departments[0]?.department_id || null,
      position_id: positions[0]?.position_id || null,
      hire_date: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (emp) => {
    try {
      // Fetch full employee data to ensure all fields are available
      const response = await employeesAPI.getById(emp.employee_id);
      const fullEmployee = response.data;
      
      setEditingEmployee(fullEmployee);
      setFormData({
        first_name: fullEmployee.first_name || '',
        last_name: fullEmployee.last_name || '',
        phone: fullEmployee.phone || '',
        email: fullEmployee.email || '',
        hire_date: fullEmployee.hire_date || '',
        status: fullEmployee.status || EmployeeStatus.ACTIVE,
        address: fullEmployee.address || '',
        nationality: fullEmployee.nationality || '',
        blood_type: fullEmployee.blood_type || 'O+',
        nssf_number: fullEmployee.nssf_number || '',
        department_id: fullEmployee.department_id || null,
        position_id: fullEmployee.position_id || null,
        start_salary: fullEmployee.start_salary || fullEmployee.reference_salary || 0
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      alert('Error loading employee data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        // Ensure all required fields are included and properly formatted
        const updateData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          email: formData.email,
          hire_date: formData.hire_date ? (formData.hire_date.includes('T') ? formData.hire_date.split('T')[0] : formData.hire_date) : '',
          status: formData.status || EmployeeStatus.ACTIVE,
          address: formData.address || '',
          nationality: formData.nationality || '',
          blood_type: formData.blood_type || 'O+',
          nssf_number: formData.nssf_number || '',
          department_id: formData.department_id ? Number(formData.department_id) : null,
          position_id: formData.position_id ? Number(formData.position_id) : null,
          start_salary: formData.start_salary ? Number(formData.start_salary) : 0
        };
        await employeesAPI.update(editingEmployee.employee_id, updateData);
        const res = await employeesAPI.getAll();
        setEmployees(res.data);
      } else {
        await employeesAPI.create(formData);
        const res = await employeesAPI.getAll();
        setEmployees(res.data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving employee:', error);
      alert(error.response?.data?.error || 'Error saving employee');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesDept = isManager ? emp.department_id === user?.department_id : true;
    const matchesView = view === 'ACTIVE' ? emp.status !== EmployeeStatus.TERMINATED : emp.status === EmployeeStatus.TERMINATED;
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesView && matchesSearch;
  });

  const getDeptName = (id) => departments.find(d => d.department_id === id)?.name || 'N/A';
  const getPosName = (id) => positions.find(p => p.position_id === id)?.title || 'N/A';

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-lg self-start">
          <button 
            onClick={() => setView('ACTIVE')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'ACTIVE' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600'}`}
          >
            Active
          </button>
          <button 
            onClick={() => setView('TERMINATED')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'TERMINATED' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600'}`}
          >
            Resigned
          </button>
        </div>
        {canModify && (
          <div className="flex items-center space-x-3">
            <button 
              onClick={openAddModal}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              <Plus size={20} />
              <span>Add Employee</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Position & Dept</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Hire Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-slate-400">ID: {emp.employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-700">{getPosName(emp.position_id)}</p>
                    <p className="text-sm text-slate-500">{getDeptName(emp.department_id)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{emp.email}</p>
                    <p className="text-sm text-slate-500">{emp.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{formatDateOnly(emp.hire_date)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {canModify && (
                        <button 
                          onClick={() => openEditModal(emp)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                      {view === 'ACTIVE' && canModify && (
                        <button 
                          onClick={() => handleResign(emp.employee_id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Resign Employee"
                        >
                          <UserMinus size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">No employees found in this view.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && canModify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">{editingEmployee ? 'Edit Employee' : 'New Employee'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-blue-600 uppercase">Personal Details</h3>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">First Name</label>
                      <input required value={formData.first_name || ''} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Last Name</label>
                      <input required value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Doe" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Phone</label>
                      <input required value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+123..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Nationality</label>
                      <input required value={formData.nationality || ''} onChange={e => setFormData({...formData, nationality: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Country" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Blood Type</label>
                      <select value={formData.blood_type || 'O+'} onChange={e => setFormData({...formData, blood_type: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-blue-600 uppercase">Employment Info</h3>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Department</label>
                      <select 
                        required
                        value={formData.department_id || ''} 
                        onChange={e => setFormData({...formData, department_id: e.target.value ? Number(e.target.value) : null})} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Position</label>
                      <select 
                        required
                        value={formData.position_id || ''} 
                        onChange={e => setFormData({...formData, position_id: e.target.value ? Number(e.target.value) : null})} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Position</option>
                        {positions.map(p => <option key={p.position_id} value={p.position_id}>{p.title}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Hiring Date</label>
                      <input 
                        required 
                        type="date" 
                        value={formData.hire_date ? (formData.hire_date.includes('T') ? formData.hire_date.split('T')[0] : formData.hire_date) : ''} 
                        onChange={e => setFormData({...formData, hire_date: e.target.value})} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">NSSF Number</label>
                      <input required value={formData.nssf_number || ''} onChange={e => setFormData({...formData, nssf_number: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123456" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Start Salary</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.start_salary || formData.reference_salary || ''} 
                        onChange={e => setFormData({...formData, start_salary: e.target.value ? Number(e.target.value) : 0})} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="0" 
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-blue-600 uppercase">Contact</h3>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Email Address</label>
                      <input required type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="email@domain.com" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Address</label>
                      <textarea required value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24" placeholder="Street, Building, City..." />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                  <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 font-bold transition-all">Save Employee</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;

