// utils/feesApi.ts
import { toast } from 'react-toastify';

const API_BASE_URL = 'https://senthurvidyalaya-backend.onrender.com/api';

export interface FeeStructure {
  id: number;
  class: string;
  fee_type: string;
  amount: number;
  due_date: string;
  academic_year: string;
}

export interface PaymentRecord {
  transaction_id: string;
  student_id: string;
  amount: number;
  mode: string;
  payment_date?: string;
}

export interface ClassFeeReport {
  student_id: string;
  student_name: string;
  paid_amount: number;
  due_amount: number;
  status: string;
  installments_count: number;
}

export interface SchoolDueReport {
  class: string;
  total_due_students: number;
  students: Array<{
    student_id: string;
    student_name: string;
    section: string;
    due_amount: number;
    installments_paid: number;
    status: string;
  }>;
}

export interface ConcessionRecord {
  fee_type: string;
  status: string;
  original_total: number;
  concession_applied: number;
  new_due: number;
}

class FeesAPI {
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Fee Structure APIs
  async getFeeStructures(academicYear: string, feeType: string = 'Tuition'): Promise<FeeStructure[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/fees/structure/view/?academic_year=${academicYear}&fee_type=${feeType}`,
        { headers: this.getHeaders() }
      );
      
      if (!response.ok) throw new Error('Failed to fetch fee structures');
      
      const data = await response.json();
      return data.structure || [];
    } catch (error) {
      toast.error('Failed to load fee structures');
      throw error;
    }
  }

  async createFeeStructure(data: {
    academic_year: string;
    class_name: string;
    fee_type: string;
    amount: number;
    due_date: string;
  }): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/fees/assign/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create fee structure');
      }

      toast.success('Fee structure created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create fee structure');
      throw error;
    }
  }

  async updateFeeStructure(data: {
    fee_id: number;
    class_name?: string;
    fee_type?: string;
    new_amount?: number;
    academic_year?: string;
  }): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/fees/structure/update/`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update fee structure');
      }

      toast.success('Fee structure updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update fee structure');
      throw error;
    }
  }

  async deleteFeeStructure(feeId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/fees/delete/`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ fee_id: feeId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete fee structure');
      }

      toast.success('Fee structure deleted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete fee structure');
      throw error;
    }
  }

  // Fee Collection APIs
  async collectFee(data: {
    student_id: string;
    class_name: string;
    fee_type: string;
    paid_amount: number;
    payment_mode: string;
    transaction_id: string;
  }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/fees/pay/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to collect fee');
      }

      const result = await response.json();
      toast.success('Fee collected successfully!');
      return result;
    } catch (error: any) {
      toast.error(error.message || 'Failed to collect fee');
      throw error;
    }
  }

  async getDailyCollection(date: string): Promise<{
    total_collected: number;
    mode_breakdown: Record<string, number>;
    transactions: PaymentRecord[];
  }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/fees/report/daily/?date=${date}`,
        { headers: this.getHeaders() }
      );
      
      if (!response.ok) throw new Error('Failed to fetch daily collection');
      
      return await response.json();
    } catch (error) {
      toast.error('Failed to load payment records');
      throw error;
    }
  }

  // Reports APIs
  async getClassFeeReport(class_name: string, section: string, fee_type: string): Promise<ClassFeeReport[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/fees/report/class/?class=${class_name}&section=${section}&fee_type=${fee_type}`,
        { headers: this.getHeaders() }
      );
      
      if (!response.ok) throw new Error('Failed to fetch class fee report');
      
      const data = await response.json();
      return data.students || [];
    } catch (error) {
      toast.error('Failed to load fee report');
      throw error;
    }
  }

  async getSchoolDueReport(academicYear: string, feeType: string): Promise<SchoolDueReport[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/fees/report/due-school/?academic_year=${academicYear}&fee_type=${feeType}`,
        { headers: this.getHeaders() }
      );
      
      if (!response.ok) throw new Error('Failed to fetch school due report');
      
      const data = await response.json();
      return data.dues_by_class || [];
    } catch (error) {
      toast.error('Failed to load due report');
      throw error;
    }
  }

  // Concession APIs
  async applyConcession(data: {
    student_id: string;
    academic_year: string;
    discounts: Array<{
      fee_type: string;
      discount_amount: number;
    }>;
  }): Promise<ConcessionRecord[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/fees/concession/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to apply concession');
      }

      const result = await response.json();
      toast.success('Concession applied successfully!');
      return result.report || [];
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply concession');
      throw error;
    }
  }

  // Receipt API
  async getReceipt(transactionId: string): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/fees/receipt/?transaction_id=${transactionId}`,
        { headers: this.getHeaders() }
      );
      
      if (!response.ok) throw new Error('Failed to fetch receipt');
      
      return await response.json();
    } catch (error) {
      toast.error('Failed to load receipt');
      throw error;
    }
  }

  // Student APIs
  async searchStudent(studentId: string): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/students/details/?student_id=${studentId}`,
        { headers: this.getHeaders() }
      );
      
      if (!response.ok) throw new Error('Failed to fetch student');
      
      return await response.json();
    } catch (error) {
      toast.error('Failed to find student');
      throw error;
    }
  }

  async getClasses(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/academics/standards/`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch classes');
      
      const data = await response.json();
      return data.map((cls: any) => cls.name);
    } catch (error) {
      toast.error('Failed to load classes');
      throw error;
    }
  }
}

export const feesAPI = new FeesAPI();