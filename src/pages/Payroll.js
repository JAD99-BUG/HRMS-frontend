import React, { useState, useEffect } from 'react';
import { Search, Edit2, Wallet, Calendar, DollarSign, X, Save, Plus, Minus } from 'lucide-react';
import { payrollAPI } from '../services/api';

const Payroll = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deductionTypes, setDeductionTypes] = useState([]);

  const fetchEmployees = async (preservePaidStatus = false) => {
    try {
      setLoading(true);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const res = await payrollAPI.getEmployees({ month: monthNum, year: yearNum });
      const newEmployees = res.data || [];
      console.log(`[Payroll] Received ${newEmployees.length} employees from API for month=${monthNum}, year=${yearNum}`);
      
      // Log status of each employee for debugging
      newEmployees.forEach(emp => {
        const status = emp.run_status ? (String(emp.run_status).toUpperCase().trim()) : 'DRAFT';
        if (status === 'PAID' || status === 'APPROVED' || status === 'PROCESSED') {
          console.log(`[Payroll] Employee ${emp.employee_id} (${emp.employee_name}): Status=${status}, PayDate=${emp.pay_date}`);
        }
      });
      
      if (preservePaidStatus) {
        // When preserving paid status, merge server data with local state
        // to ensure PAID status doesn't get overwritten by stale server data
        setEmployees(prevEmployees => {
          const prevPaidMap = {};
          prevEmployees.forEach(emp => {
            const status = emp.run_status ? (String(emp.run_status).toUpperCase().trim()) : '';
            if (status === 'PAID' || status === 'APPROVED' || status === 'PROCESSED') {
              prevPaidMap[emp.employee_id] = {
                run_status: emp.run_status,
                pay_date: emp.pay_date
              };
            }
          });
          
          // Merge: use server data but preserve local PAID status if it exists
          return newEmployees.map(emp => {
            if (prevPaidMap[emp.employee_id]) {
              return {
                ...emp,
                run_status: prevPaidMap[emp.employee_id].run_status,
                pay_date: prevPaidMap[emp.employee_id].pay_date
              };
            }
            return emp;
          });
        });
      } else {
        // On fresh load, trust the backend data completely
        setEmployees([...newEmployees]);
        console.log(`[Payroll] Set employees state with ${newEmployees.length} employees (fresh load)`);
      }
      
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Error loading payroll data: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDeductionTypes();
  }, [month, year]);

  const fetchDeductionTypes = async () => {
    try {
      const res = await payrollAPI.getDeductionTypes();
      setDeductionTypes(res.data || []);
    } catch (error) {
      console.error('Error fetching deduction types:', error);
    }
  };

  const handleEdit = (emp, index) => {
    const normalizedStatus = (emp.run_status || '').toUpperCase().trim();
    const isPaid = normalizedStatus === 'PAID' || normalizedStatus === 'APPROVED' || normalizedStatus === 'PROCESSED';
    
    if (isPaid) {
      alert('This employee is already marked as paid. Cannot edit.');
      return;
    }
    
    // Initialize deductions array if it doesn't exist
    const deductions = (emp.deductions || []).map(d => ({
      deduction_type_id: d.deduction_type_id || (deductionTypes.length > 0 ? deductionTypes[0].deduction_type_id : 1),
      deduction_type_name: d.deduction_type_name || '',
      amount: d.amount || 0,
      reason: d.reason || '',
      effective_date: d.effective_date || new Date().toISOString().split('T')[0]
    }));
    
    setEditingEmployee({ 
      ...emp, 
      index,
      hour_variance: emp.hour_variance !== undefined && emp.hour_variance !== null ? emp.hour_variance : 0,
      deductions: deductions
    });
    setIsEditModalOpen(true);
  };

  const addDeduction = () => {
    if (!editingEmployee) return;
    const newDeduction = {
      deduction_type_id: deductionTypes.length > 0 ? deductionTypes[0].deduction_type_id : 1,
      deduction_type_name: deductionTypes.length > 0 ? deductionTypes[0].name : '',
      amount: 0,
      reason: '',
      effective_date: new Date().toISOString().split('T')[0]
    };
    setEditingEmployee({
      ...editingEmployee,
      deductions: [...(editingEmployee.deductions || []), newDeduction]
    });
  };

  const removeDeduction = (index) => {
    if (!editingEmployee) return;
    const updatedDeductions = [...(editingEmployee.deductions || [])];
    updatedDeductions.splice(index, 1);
    setEditingEmployee({
      ...editingEmployee,
      deductions: updatedDeductions
    });
  };

  const updateDeduction = (index, field, value) => {
    if (!editingEmployee) return;
    const updatedDeductions = [...(editingEmployee.deductions || [])];
    updatedDeductions[index] = {
      ...updatedDeductions[index],
      [field]: value
    };
    
    // If deduction_type_id changed, update the name
    if (field === 'deduction_type_id') {
      const selectedType = deductionTypes.find(dt => dt.deduction_type_id === parseInt(value));
      if (selectedType) {
        updatedDeductions[index].deduction_type_name = selectedType.name;
      }
    }
    
    setEditingEmployee({
      ...editingEmployee,
      deductions: updatedDeductions
    });
  };

  const handleApprove = async (emp, index) => {
    const normalizedStatus = (emp.run_status || '').toUpperCase().trim();
    const isPaid = normalizedStatus === 'PAID' || normalizedStatus === 'APPROVED' || normalizedStatus === 'PROCESSED';
    
    if (isPaid) {
      alert('This employee is already approved/paid.');
      return;
    }
    
    if (!confirm(`Approve and mark ${emp.employee_name} as paid?`)) return;

    try {
      setSaving(true);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      const totalDeductions = (emp.deductions || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      const hourVariance = emp.hour_variance || 0;
      const gross = emp.gross_salary || 0;
      const bonus = emp.bonus_amount || 0;
      
      // Calculate salary deduction from hour variance (if negative)
      let hourVarianceDeduction = 0;
      if (hourVariance < 0 && gross > 0) {
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        let workingDays = 0;
        for (let day = 1; day <= lastDay; day++) {
          const date = new Date(yearNum, monthNum - 1, day);
          const dayOfWeek = date.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            workingDays++;
          }
        }
        const expectedHours = workingDays * 8;
        const hourlyRate = expectedHours > 0 ? gross / expectedHours : 0;
        hourVarianceDeduction = Math.abs(hourVariance) * hourlyRate;
      }
      
      // Calculate net salary with hour variance deduction
      const netSalary = Math.max(0, gross + bonus - totalDeductions - hourVarianceDeduction);
      
      const entries = [{
        assignment_id: emp.assignment_id,
        gross_salary: gross,
        bonus_amount: bonus,
        hour_variance: hourVariance,
        net_salary: netSalary,
        remarks: emp.remarks || null,
        payroll_entry_id: emp.payroll_entry_id || null,
        deductions: emp.deductions || []
      }];

      await payrollAPI.bulkUpdateEntries({
        month: monthNum,
        year: yearNum,
        entries,
        created_by_user_id: 1
      });

      const payResult = await payrollAPI.payIndividual({
        month: monthNum,
        year: yearNum,
        assignment_id: emp.assignment_id,
        employee_id: emp.employee_id
      });

      const paidDate = payResult.data.pay_date || new Date().toISOString().split('T')[0];
      
      setEmployees(prevEmployees => {
        return prevEmployees.map(e => {
          if (e.employee_id === emp.employee_id) {
            return {
              ...e,
              run_status: 'PAID',
              pay_date: paidDate
            };
          }
          return e;
        });
      });
      
      setRefreshKey(prev => prev + 1);
      setSaving(false);
      await fetchEmployees();
    } catch (error) {
      setSaving(false);
      console.error('[HandleApprove] Error:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handlePayIndividual = async (emp, index) => {
    const normalizedStatus = (emp.run_status || '').toUpperCase().trim();
    const isPaid = normalizedStatus === 'PAID' || normalizedStatus === 'APPROVED' || normalizedStatus === 'PROCESSED';
    
    if (isPaid) {
      alert('This employee is already marked as paid.');
      return;
    }
    
    if (!confirm(`Mark ${emp.employee_name} as paid?`)) return;

    try {
      setSaving(true);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      const totalDeductions = (emp.deductions || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      // Preserve negative values for hour_variance
      const hourVariance = (emp.hour_variance !== undefined && emp.hour_variance !== null) ? parseFloat(emp.hour_variance) || 0 : 0;
      const gross = emp.gross_salary || 0;
      const bonus = emp.bonus_amount || 0;
      
      // Calculate salary deduction from hour variance (if negative)
      let hourVarianceDeduction = 0;
      if (hourVariance < 0 && gross > 0) {
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        let workingDays = 0;
        for (let day = 1; day <= lastDay; day++) {
          const date = new Date(yearNum, monthNum - 1, day);
          const dayOfWeek = date.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            workingDays++;
          }
        }
        const expectedHours = workingDays * 8;
        const hourlyRate = expectedHours > 0 ? gross / expectedHours : 0;
        hourVarianceDeduction = Math.abs(hourVariance) * hourlyRate;
      }
      
      // Calculate net salary with hour variance deduction
      const netSalary = Math.max(0, gross + bonus - totalDeductions - hourVarianceDeduction);
      
      const entries = [{
        assignment_id: emp.assignment_id,
        gross_salary: gross,
        bonus_amount: bonus,
        hour_variance: hourVariance,
        net_salary: netSalary,
        remarks: emp.remarks || null,
        payroll_entry_id: emp.payroll_entry_id || null,
        deductions: emp.deductions || []
      }];

      // Step 1: Save/update payroll entry data first
      console.log('[HandlePayIndividual] Saving payroll entry data...');
      await payrollAPI.bulkUpdateEntries({
        month: monthNum,
        year: yearNum,
        entries,
        created_by_user_id: 1
      });
      console.log('[HandlePayIndividual] Payroll entry data saved successfully');

      // Step 2: Mark as paid
      console.log('[HandlePayIndividual] Marking employee as paid...');
      const payResult = await payrollAPI.payIndividual({
        month: monthNum,
        year: yearNum,
        assignment_id: emp.assignment_id,
        employee_id: emp.employee_id
      });
      console.log('[HandlePayIndividual] Pay result:', payResult.data);

      const paidDate = payResult.data.pay_date || new Date().toISOString().split('T')[0];
      const verifiedStatus = payResult.data.status || 'PAID';
      
      // Step 3: Update local state immediately to show UI change right away
      setEmployees(prevEmployees => {
        const updated = prevEmployees.map(e => {
          if (e.employee_id === emp.employee_id) {
            const updatedEmp = {
              ...e,
              run_status: verifiedStatus,
              pay_date: paidDate
            };
            console.log('[HandlePayIndividual] Updated employee:', updatedEmp.employee_name, 'Status:', updatedEmp.run_status);
            return updatedEmp;
          }
          return e;
        });
        return updated;
      });
      
      // Force UI update by incrementing refresh key
      setRefreshKey(prev => prev + 1);
      setSaving(false);
      
      // Show success message
      alert(`${emp.employee_name} has been marked as paid successfully!`);
      
      // Step 4: Refresh from server after alert is dismissed to sync with database
      // Wait longer to ensure database transaction is fully committed
      // Use preservePaidStatus flag to prevent overwriting the PAID status
      setTimeout(async () => {
        console.log('[HandlePayIndividual] Refreshing employee data from server...');
        try {
          await fetchEmployees(true); // Pass true to preserve paid status
        } catch (error) {
          console.error('[HandlePayIndividual] Error refreshing:', error);
          // Don't reset state on refresh error - keep the paid status
        }
      }, 1500);
    } catch (error) {
      setSaving(false);
      console.error('[HandlePayIndividual] Error:', error);
      console.error('[HandlePayIndividual] Error details:', error.response?.data);
      alert('Error marking employee as paid: ' + (error.response?.data?.error || error.message));
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const gross = parseFloat(editingEmployee.gross_salary);
      const bonus = parseFloat(editingEmployee.bonus_amount) || 0;
      // Allow negative values for hour variance - only default to 0 if empty/null/undefined
      const hourVariance = (editingEmployee.hour_variance === '' || editingEmployee.hour_variance === null || editingEmployee.hour_variance === undefined) 
        ? 0 
        : parseFloat(editingEmployee.hour_variance);
      const totalDeductions = (editingEmployee.deductions || []).reduce((sum, d) => {
        const amount = parseFloat(d.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      // Calculate salary deduction from hour variance (if negative)
      let hourVarianceDeduction = 0;
      if (hourVariance < 0 && gross > 0) {
        // Calculate hourly rate from monthly salary
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        let workingDays = 0;
        for (let day = 1; day <= lastDay; day++) {
          const date = new Date(yearNum, monthNum - 1, day);
          const dayOfWeek = date.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            workingDays++;
          }
        }
        const expectedHours = workingDays * 8;
        const hourlyRate = expectedHours > 0 ? gross / expectedHours : 0;
        hourVarianceDeduction = Math.abs(hourVariance) * hourlyRate;
      }
      
      // Calculate net salary: gross + bonus - totalDeductions - hourVarianceDeduction
      // Ensure net salary never goes negative (cap at 0)
      const netSalary = Math.max(0, gross + bonus - totalDeductions - hourVarianceDeduction);
      
      const formattedDeductions = (editingEmployee.deductions || [])
        .filter(d => {
          const amount = parseFloat(d.amount);
          return !isNaN(amount) && amount > 0;
        })
        .map(d => ({
          deduction_type_id: parseInt(d.deduction_type_id) || 1,
          amount: parseFloat(d.amount) || 0,
          reason: d.reason || '',
          effective_date: d.effective_date || new Date().toISOString().split('T')[0]
        }));
      
      const entries = [{
        assignment_id: parseInt(editingEmployee.assignment_id),
        gross_salary: gross,
        bonus_amount: bonus,
        hour_variance: hourVariance,
        net_salary: netSalary,
        remarks: editingEmployee.remarks || null,
        payroll_entry_id: editingEmployee.payroll_entry_id ? parseInt(editingEmployee.payroll_entry_id) : null,
        deductions: formattedDeductions
      }];

      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      await payrollAPI.bulkUpdateEntries({
        month: monthNum,
        year: yearNum,
        entries,
        created_by_user_id: 1
      });

      setIsEditModalOpen(false);
      setEditingEmployee(null);
      await fetchEmployees();
      alert('Payroll updated successfully!');
    } catch (error) {
      console.error('Error saving payroll:', error);
      alert('Error saving: ' + (error.response?.data?.error || error.message));
    }
  };

  const handlePostAll = async () => {
    const unpaidEmployees = employees.filter(emp => {
      const normalizedStatus = (emp.run_status || '').toUpperCase().trim();
      return normalizedStatus !== 'PAID' && normalizedStatus !== 'APPROVED' && normalizedStatus !== 'PROCESSED';
    });
    
    if (unpaidEmployees.length === 0) {
      alert('All employees are already marked as paid.');
      return;
    }
    
    if (!confirm(`Mark all ${unpaidEmployees.length} unpaid employee(s) as paid?`)) {
      return;
    }

    try {
      setSaving(true);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      const entries = employees.map(emp => {
        const totalDeductions = (emp.deductions || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        // Preserve negative values for hour_variance
        const hourVariance = (emp.hour_variance !== undefined && emp.hour_variance !== null) ? parseFloat(emp.hour_variance) || 0 : 0;
        const gross = emp.gross_salary || 0;
        const bonus = emp.bonus_amount || 0;
        
        // Calculate salary deduction from hour variance (if negative)
        let hourVarianceDeduction = 0;
        if (hourVariance < 0 && gross > 0) {
          const lastDay = new Date(yearNum, monthNum, 0).getDate();
          let workingDays = 0;
          for (let day = 1; day <= lastDay; day++) {
            const date = new Date(yearNum, monthNum - 1, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
              workingDays++;
            }
          }
          const expectedHours = workingDays * 8;
          const hourlyRate = expectedHours > 0 ? gross / expectedHours : 0;
          hourVarianceDeduction = Math.abs(hourVariance) * hourlyRate;
        }
        
        // Calculate net salary with hour variance deduction
        const netSalary = Math.max(0, gross + bonus - totalDeductions - hourVarianceDeduction);
        
        return {
          assignment_id: emp.assignment_id,
          gross_salary: gross,
          bonus_amount: bonus,
          hour_variance: hourVariance,
          net_salary: netSalary,
          remarks: emp.remarks || null,
          payroll_entry_id: emp.payroll_entry_id || null,
          deductions: emp.deductions || []
        };
      });

      await payrollAPI.bulkUpdateEntries({
        month: monthNum,
        year: yearNum,
        entries,
        created_by_user_id: 1
      });

      const payResult = await payrollAPI.payAll({
        month: monthNum,
        year: yearNum
      });

      const currentDate = new Date().toISOString().split('T')[0];
      setEmployees(prevEmployees => {
        return prevEmployees.map(emp => {
          const normalizedStatus = (emp.run_status || '').toUpperCase().trim();
          const isPaid = normalizedStatus === 'PAID' || normalizedStatus === 'APPROVED' || normalizedStatus === 'PROCESSED';
          
          if (!isPaid) {
            return {
              ...emp,
              run_status: 'PAID',
              pay_date: payResult.data.pay_date || currentDate
            };
          }
          return emp;
        });
      });
      
      setRefreshKey(prev => prev + 1);
      setSaving(false);
      await fetchEmployees();
      alert('All unpaid employees marked as paid successfully!');
    } catch (error) {
      setSaving(false);
      console.error('Error posting all:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const years = Array.from({ length: 15 }, (_, i) => 2020 + i);
  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const totalNetSalary = employees.reduce((sum, emp) => sum + (parseFloat(emp.net_salary) || 0), 0);

  if (loading) {
    return <div className="text-center py-12">Loading payroll data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Payroll</h1>
        <div className="flex gap-4 items-center">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handlePostAll}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Processing...' : 'Post & Save All'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700 uppercase text-xs">Employee</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700 uppercase text-xs">Base Salary</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700 uppercase text-xs">Bonus</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700 uppercase text-xs">Variance</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700 uppercase text-xs">Deductions</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700 uppercase text-xs">Net Salary</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700 uppercase text-xs">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                    No payroll data available for {months.find(m => m.value === month)?.label} {year}.
                  </td>
                </tr>
              ) : (
                employees.map((emp, index) => {
                const normalizedStatus = emp.run_status ? (emp.run_status.toUpperCase().trim()) : 'DRAFT';
                const isPaid = normalizedStatus === 'PAID' || normalizedStatus === 'APPROVED' || normalizedStatus === 'PROCESSED';
                const status = isPaid ? 'PAID' : 'DRAFT';
                const deductionCount = (emp.deductions || []).length;
                
                return (
                  <tr key={`${emp.employee_id}-${normalizedStatus}-${emp.pay_date || 'no-date'}-${refreshKey}`} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <td className="px-6 py-4 font-bold text-slate-800">{emp.employee_name}</td>
                    <td className="px-6 py-4 text-right text-slate-700">${(emp.gross_salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right text-slate-700">
                      {emp.bonus_amount > 0 ? '+' : ''}${(emp.bonus_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">
                      {emp.hour_variance !== undefined && emp.hour_variance !== null ? emp.hour_variance : 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deductionCount > 0 ? (
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          {deductionCount} Item{deductionCount !== 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="text-slate-500">0 Items</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">${(emp.net_salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {status}
                      </span>
                      {isPaid && emp.pay_date && (
                        <div className="text-xs text-slate-500 mt-1">
                          Paid: {new Date(emp.pay_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center items-center">
                        <button
                          onClick={() => handleEdit(emp, index)}
                          disabled={isPaid}
                          className={`p-2 rounded-lg transition-colors ${
                            isPaid 
                              ? 'text-slate-300 cursor-not-allowed opacity-50' 
                              : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title={isPaid ? 'Cannot edit paid payroll' : 'Edit payroll'}
                        >
                          <Edit2 size={18} />
                        </button>
                        {!isPaid && (
                          <button
                            onClick={() => handlePayIndividual(emp, index)}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-1"
                          >
                            <DollarSign size={16} />
                            {saving ? 'Processing...' : 'Pay'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td colSpan="5" className="px-6 py-4 text-right font-bold text-slate-800 uppercase text-sm">Total</td>
                <td className="px-6 py-4 text-right font-bold text-lg text-slate-800">${totalNetSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {isEditModalOpen && editingEmployee && (() => {
        const normalizedStatus = (editingEmployee.run_status || '').toUpperCase().trim();
        const isPaid = normalizedStatus === 'PAID' || normalizedStatus === 'APPROVED' || normalizedStatus === 'PROCESSED';
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Edit Payroll - {editingEmployee.employee_name}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            {isPaid && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  This payroll is already marked as paid. Hour variance and salary values are read-only.
                </p>
              </div>
            )}
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base Salary</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEmployee.gross_salary || 0}
                    onChange={(e) => setEditingEmployee({...editingEmployee, gross_salary: e.target.value})}
                    className={`w-full px-4 py-2 border border-slate-300 rounded-lg ${isPaid ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                    required
                    disabled={isPaid}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bonus</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEmployee.bonus_amount || 0}
                    onChange={(e) => setEditingEmployee({...editingEmployee, bonus_amount: e.target.value})}
                    className={`w-full px-4 py-2 border border-slate-300 rounded-lg ${isPaid ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                    disabled={isPaid}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hour Variance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEmployee.hour_variance !== undefined && editingEmployee.hour_variance !== null ? editingEmployee.hour_variance : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string, negative values (including just "-"), and positive values
                      // Preserve the value as-is to allow typing negative numbers
                      setEditingEmployee({...editingEmployee, hour_variance: value});
                    }}
                    className={`w-full px-4 py-2 border border-slate-300 rounded-lg ${isPaid ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                    disabled={isPaid}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Deductions</label>
                  {!isPaid && (
                    <button
                      type="button"
                      onClick={addDeduction}
                      className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Deduction
                    </button>
                  )}
                </div>
                <div className="space-y-2 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  {(!editingEmployee.deductions || editingEmployee.deductions.length === 0) ? (
                    <p className="text-sm text-slate-500 text-center py-2">No deductions added. Click "Add Deduction" to add one.</p>
                  ) : (
                    editingEmployee.deductions.map((deduction, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                        <div className={`grid gap-2 items-end ${isPaid ? 'grid-cols-11' : 'grid-cols-12'}`}>
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Deduction Type</label>
                            <select
                              value={deduction.deduction_type_id || ''}
                              onChange={(e) => updateDeduction(index, 'deduction_type_id', e.target.value)}
                              className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg ${isPaid ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                              required
                              disabled={isPaid}
                            >
                              {deductionTypes.map(dt => (
                                <option key={dt.deduction_type_id} value={dt.deduction_type_id}>
                                  {dt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-5">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
                            <input
                              type="text"
                              value={deduction.reason || ''}
                              onChange={(e) => updateDeduction(index, 'reason', e.target.value)}
                              className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg ${isPaid ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                              placeholder="Enter reason"
                              disabled={isPaid}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Amount</label>
                            <input
                              type="number"
                              step="0.01"
                              value={deduction.amount || 0}
                              onChange={(e) => updateDeduction(index, 'amount', e.target.value)}
                              className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg ${isPaid ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                              required
                              disabled={isPaid}
                            />
                          </div>
                          {!isPaid && (
                            <div className="col-span-1">
                              <button
                                type="button"
                                onClick={() => removeDeduction(index)}
                                className="w-full px-2 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center justify-center"
                                title="Remove deduction"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {editingEmployee.deductions && editingEmployee.deductions.length > 0 && (
                  <div className="mt-2 text-right">
                    <span className="text-sm font-medium text-slate-700">
                      Total Deductions: ${(editingEmployee.deductions || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={editingEmployee.remarks || ''}
                  onChange={(e) => setEditingEmployee({...editingEmployee, remarks: e.target.value})}
                  className={`w-full px-4 py-2 border border-slate-300 rounded-lg ${isPaid ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                  rows="3"
                  disabled={isPaid}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                {!isPaid && (
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default Payroll;
