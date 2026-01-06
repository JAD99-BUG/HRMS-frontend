import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, ChevronRight, X, User, Briefcase } from 'lucide-react';
import { departmentsAPI, employeesAPI, positionsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RoleType } from '../utils/constants';

const Departments = () => {
  const { user } = useAuth();
  const [depts, setDepts] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isManager = user?.role === RoleType.MANAGER;
  
  const [newPosition, setNewPosition] = useState({
    title: '',
    description: ''
  });

  const [newDept, setNewDept] = useState({
    name: '',
    description: '',
    budget: '',
    manager_assignment_id: ''
  });

  const fetchData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        departmentsAPI.getAll(),
        employeesAPI.getAll()
      ]);
      setDepts(deptRes.data);
      setAllEmployees(empRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh departments when modal closes (in case employees were updated elsewhere)
  useEffect(() => {
    if (!isModalOpen) {
      fetchData();
    }
  }, [isModalOpen]);

  // Refresh data when window regains focus (in case employees were updated in another tab/window)
  useEffect(() => {
    const handleFocus = () => {
      fetchData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchDeptEmployees = async () => {
    if (selectedDeptId) {
      try {
        setLoading(true);
        const res = await departmentsAPI.getEmployees(selectedDeptId);
        console.log('Department employees response:', res.data);
        setDeptEmployees(res.data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
        setDeptEmployees([]);
        alert('Error loading department employees: ' + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    } else {
      setDeptEmployees([]);
    }
  };

  useEffect(() => {
    fetchDeptEmployees();
  }, [selectedDeptId]);


  const filteredDepts = isManager 
    ? depts.filter(d => d.department_id === user?.department_id)
    : depts;

  const selectedDept = depts.find(d => d.department_id === selectedDeptId);

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setNewDept({
      name: dept.name,
      description: dept.description || '',
      budget: dept.budget || '',
      manager_assignment_id: dept.manager_assignment_id || ''
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingDept(null);
    setNewDept({
      name: '',
      description: '',
      budget: '',
      manager_assignment_id: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitDepartment = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await departmentsAPI.update(editingDept.department_id, newDept);
      } else {
        await departmentsAPI.create(newDept);
      }
      const res = await departmentsAPI.getAll();
      setDepts(res.data);
      setIsModalOpen(false);
      setEditingDept(null);
      setNewDept({ name: '', description: '', budget: '', manager_assignment_id: '' });
    } catch (error) {
      alert(error.response?.data?.error || `Error ${editingDept ? 'updating' : 'creating'} department`);
    }
  };

  const handleSubmitPosition = async (e) => {
    e.preventDefault();
    try {
      await positionsAPI.create(newPosition);
      setIsPositionModalOpen(false);
      setNewPosition({ title: '', description: '' });
      alert('Position created successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Error creating position');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {!selectedDeptId ? (
        <>
          <div className="flex justify-between items-center">
            <p className="text-slate-500 font-medium">
              {isManager ? 'Manage your designated department.' : 'Manage organization structure and budgets.'}
            </p>
            {!isManager && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPositionModalOpen(true)}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all"
                >
                  <Briefcase size={20} />
                  <span>Add Position</span>
                </button>
                <button 
                  onClick={openAddModal}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                >
                  <Plus size={20} />
                  <span>New Department</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepts.map((dept) => (
              <div key={dept.department_id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Building2 size={24} />
                  </div>
                  {!isManager && (
                    <button 
                      onClick={() => openEditModal(dept)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{dept.name}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{dept.description}</p>
                
                {dept.manager_name && (
                  <div className="mb-4 p-2 bg-blue-50 rounded-lg">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department Head</p>
                    <p className="text-sm font-bold text-blue-700">{dept.manager_name}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-3 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff</p>
                    <p className="text-xl font-bold text-slate-800">{dept.staff_count || 0}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="text-xs">
                    <span className="text-slate-400 block mb-0.5">Annual Budget</span>
                    <span className="font-bold text-slate-800">${(dept.budget || 0).toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedDeptId(dept.department_id)}
                    className="flex items-center space-x-1 text-sm font-bold text-blue-600 hover:text-blue-700"
                  >
                    <span>View Team</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSelectedDeptId(null)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronRight size={24} className="rotate-180" />
            </button>
            <h2 className="text-2xl font-bold">{selectedDept?.name} Team</h2>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-slate-500">Loading employees...</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-lg mb-1">Employee Roster</h3>
                <p className="text-sm text-slate-500">{deptEmployees.length} employees currently assigned.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Employee Name</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deptEmployees.length > 0 ? (
                      deptEmployees.map(emp => (
                        <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                {emp.first_name?.[0] || ''}{emp.last_name?.[0] || ''}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{emp.first_name} {emp.last_name}</p>
                                <p className="text-xs text-slate-400">ID: {emp.employee_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-700">{emp.department_name || selectedDept?.name || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-700">{emp.position_title || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{emp.email || 'N/A'}</td>
                          <td className="px-6 py-4 text-slate-500">
                            {emp.hire_date ? (emp.hire_date.includes('T') ? emp.hire_date.split('T')[0] : emp.hire_date) : 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                          No employees currently assigned to this department.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingDept ? 'Edit Department' : 'Add New Department'}</h2>
              <button onClick={() => {
                setIsModalOpen(false);
                setEditingDept(null);
                setNewDept({ name: '', description: '', budget: '', manager_assignment_id: '' });
              }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitDepartment} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Department Name</label>
                <input 
                  required
                  type="text" 
                  value={newDept.name}
                  onChange={e => setNewDept({...newDept, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" 
                  placeholder="e.g. Finance"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <textarea 
                  value={newDept.description}
                  onChange={e => setNewDept({...newDept, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-20 bg-slate-50" 
                  placeholder="What does this department do?"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Initial Budget ($)</label>
                <input 
                  type="number" 
                  value={newDept.budget}
                  onChange={e => setNewDept({...newDept, budget: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" 
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Department Head</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    required
                    value={newDept.manager_assignment_id || ''} 
                    onChange={e => setNewDept({...newDept, manager_assignment_id: e.target.value ? Number(e.target.value) : null})}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                  >
                    <option value="">Select Department Head</option>
                    {allEmployees
                      .filter(emp => emp.assignment_id && emp.status === 'ACTIVE' && emp.employee_id && emp.assignment_id)
                      .map(emp => (
                        <option key={emp.assignment_id} value={emp.assignment_id}>
                          {emp.first_name} {emp.last_name} {emp.position_title ? `- ${emp.position_title}` : ''}
                        </option>
                      ))}
                    {allEmployees.filter(emp => emp.assignment_id && emp.status === 'ACTIVE' && emp.employee_id && emp.assignment_id).length === 0 && (
                      <option value="" disabled>No active employees with assignments available</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                  {editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPositionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add New Position</h2>
              <button onClick={() => {
                setIsPositionModalOpen(false);
                setNewPosition({ title: '', description: '' });
              }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitPosition} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Position Title</label>
                <input 
                  required
                  type="text" 
                  value={newPosition.title}
                  onChange={e => setNewPosition({...newPosition, title: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-slate-50" 
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <textarea 
                  value={newPosition.description}
                  onChange={e => setNewPosition({...newPosition, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none h-20 bg-slate-50" 
                  placeholder="Position description and responsibilities"
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                  Create Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;

